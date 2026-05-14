import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import {
  runCargoTypeAgent,
  runGeographyAgent,
  runHandlingAgent,
  runSizeAgent,
} from "./agents";
import { coordinatePackage } from "./coordinator";
import { defaultPackage, demoPackages } from "./demoPackages";
import type { DemoPackage } from "./demoPackages";
import type {
  AgentOutput,
  CoordinationStrategy,
  CoordinatorDecision,
  Lane,
  PackageInfo,
} from "./types";
import { depotLanes, specialLanes, strategyLabels } from "./types";

const stations = [
  "Input",
  "Geography Agent",
  "Cargo Type Agent",
  "Size Agent",
  "Handling Agent",
  "Coordinator",
  "Hub",
  "Depot",
];

const speedOptions = [
  { label: "Slow", delay: 1200 },
  { label: "Normal", delay: 800 },
  { label: "Fast", delay: 350 },
];

type QueuedPackage = DemoPackage & {
  queueId: string;
  sequence: number;
};

type ScoreState = {
  packagesProcessed: number;
  scoredPackages: number;
  correctDecisions: number;
  manualReviewCount: number;
  conflictCount: number;
};

type EventLogEntry = {
  id: number;
  message: string;
};

type RunSource = {
  name: string;
  expectedLane: Lane | null;
  expectedHub: string | null;
  expectedDepot: string | null;
  expectedRoute: string[] | null;
  expectedHandling: Lane | "NORMAL" | null;
};

const initialScore: ScoreState = {
  packagesProcessed: 0,
  scoredPackages: 0,
  correctDecisions: 0,
  manualReviewCount: 0,
  conflictCount: 0,
};

const delay = (duration: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const formatConfidence = (confidence: number) => `${Math.round(confidence * 100)}%`;

const clonePackage = (pkg: PackageInfo): PackageInfo => ({ ...pkg });

const normaliseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeTimestampForFilename = (timestamp: string) => timestamp.replace(/[:.]/g, "-");

const makeQueueItem = (preset: DemoPackage, sequence: number): QueuedPackage => ({
  ...preset,
  packageInfo: clonePackage(preset.packageInfo),
  queueId: `${preset.id}-${sequence}`,
  sequence,
});

const createInitialQueue = () =>
  demoPackages.slice(0, 5).map((preset, index) => makeQueueItem(preset, index));

function App() {
  const initialPreset = demoPackages[0];
  const [packageInfo, setPackageInfo] = useState<PackageInfo>(() => clonePackage(defaultPackage));
  const [draftPackageName, setDraftPackageName] = useState(initialPreset.name);
  const [draftExpectedLane, setDraftExpectedLane] = useState<Lane | null>(
    initialPreset.expectedLane,
  );
  const [draftExpectedHub, setDraftExpectedHub] = useState<string | null>(initialPreset.expectedHub);
  const [draftExpectedDepot, setDraftExpectedDepot] = useState<string | null>(
    initialPreset.expectedDepot,
  );
  const [draftExpectedRoute, setDraftExpectedRoute] = useState<string[] | null>(
    initialPreset.expectedRoute,
  );
  const [draftExpectedHandling, setDraftExpectedHandling] = useState<Lane | "NORMAL" | null>(
    initialPreset.expectedHandling,
  );
  const [activePackage, setActivePackage] = useState<PackageInfo>(() => clonePackage(defaultPackage));
  const [activePackageName, setActivePackageName] = useState(initialPreset.name);
  const [activeExpectedLane, setActiveExpectedLane] = useState<Lane | null>(
    initialPreset.expectedLane,
  );
  const [activeExpectedHub, setActiveExpectedHub] = useState<string | null>(
    initialPreset.expectedHub,
  );
  const [activeExpectedDepot, setActiveExpectedDepot] = useState<string | null>(
    initialPreset.expectedDepot,
  );
  const [activeExpectedRoute, setActiveExpectedRoute] = useState<string[] | null>(
    initialPreset.expectedRoute,
  );
  const [activeExpectedHandling, setActiveExpectedHandling] = useState<Lane | "NORMAL" | null>(
    initialPreset.expectedHandling,
  );
  const [packageQueue, setPackageQueue] = useState<QueuedPackage[]>(createInitialQueue);
  const [nextQueueIndex, setNextQueueIndex] = useState(demoPackages.length);
  const [strategy, setStrategy] = useState<CoordinationStrategy>("rule");
  const [speedIndex, setSpeedIndex] = useState(1);
  const [stage, setStage] = useState(0);
  const [agentOutputs, setAgentOutputs] = useState<AgentOutput[]>([]);
  const [decision, setDecision] = useState<CoordinatorDecision | null>(null);
  const [score, setScore] = useState<ScoreState>(initialScore);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [showReasoning, setShowReasoning] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [status, setStatus] = useState<"Ready" | "Processing" | "Completed">("Ready");
  const eventIdRef = useRef(0);
  const runIdRef = useRef(0);
  const autoRunRef = useRef(false);

  const currentDelay = speedOptions[speedIndex].delay;
  const currentStation = stations[stage];
  const hasConflict = Boolean(decision?.detectedConflicts.length);
  const selectedLane = decision?.finalLane;
  const activeDepotLane = useMemo(() => {
    const geographyOutput = agentOutputs.find((output) => output.agent === "Geography Agent");

    if (geographyOutput?.suggestedLane && depotLanes.includes(geographyOutput.suggestedLane)) {
      return geographyOutput.suggestedLane;
    }

    if (decision?.finalLane && depotLanes.includes(decision.finalLane)) {
      return decision.finalLane;
    }

    return null;
  }, [agentOutputs, decision]);
  const parcelLeft = `${(stage / (stations.length - 1)) * 100}%`;
  const parcelStyle = { "--parcel-left": parcelLeft } as CSSProperties;

  const volume = useMemo(
    () => packageInfo.length * packageInfo.width * packageInfo.height,
    [packageInfo.height, packageInfo.length, packageInfo.width],
  );

  const markDraftAsCustom = () => {
    setDraftPackageName("Custom package");
    setDraftExpectedLane(null);
    setDraftExpectedHub(null);
    setDraftExpectedDepot(null);
    setDraftExpectedRoute(null);
    setDraftExpectedHandling(null);
  };

  const appendEvent = (message: string) => {
    eventIdRef.current += 1;
    const nextEntry = { id: eventIdRef.current, message };
    setEventLog((current) => [...current.slice(-13), nextEntry]);
  };

  const setTextField =
    (field: keyof Pick<PackageInfo, "addressLine" | "city" | "postcode" | "cargoDescription">) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      markDraftAsCustom();
      setPackageInfo((current) => ({ ...current, [field]: event.target.value }));
    };

  const setNumberField =
    (field: keyof Pick<PackageInfo, "length" | "width" | "height" | "weight">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      markDraftAsCustom();
      setPackageInfo((current) => ({ ...current, [field]: normaliseNumber(event.target.value) }));
    };

  const setBooleanField =
    (field: keyof Pick<PackageInfo, "fragile" | "coldChain" | "priority">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      markDraftAsCustom();
      setPackageInfo((current) => ({ ...current, [field]: event.target.checked }));
    };

  const updateScore = (finalDecision: CoordinatorDecision, source: RunSource) => {
    const routeMatches =
      !source.expectedHub ||
      (finalDecision.hub === source.expectedHub && finalDecision.depot === source.expectedDepot);
    const handlingMatches =
      !source.expectedHandling || finalDecision.finalHandlingLane === source.expectedHandling;
    const laneMatches = Boolean(source.expectedLane && finalDecision.finalLane === source.expectedLane);
    const isCorrect = laneMatches && routeMatches && handlingMatches;

    setScore((current) => ({
      packagesProcessed: current.packagesProcessed + 1,
      scoredPackages: current.scoredPackages + (source.expectedLane ? 1 : 0),
      correctDecisions: current.correctDecisions + (isCorrect ? 1 : 0),
      manualReviewCount:
        current.manualReviewCount + (finalDecision.finalLane === "MANUAL_REVIEW" ? 1 : 0),
      conflictCount: current.conflictCount + finalDecision.detectedConflicts.length,
    }));
  };

  const runSortingForPackage = async (packageSnapshot: PackageInfo, source: RunSource) => {
    if (isRunning) {
      return;
    }

    const runId = Date.now();
    runIdRef.current = runId;
    const selectedStrategy = strategy;

    setActivePackage(packageSnapshot);
    setActivePackageName(source.name);
    setActiveExpectedLane(source.expectedLane);
    setActiveExpectedHub(source.expectedHub);
    setActiveExpectedDepot(source.expectedDepot);
    setActiveExpectedRoute(source.expectedRoute);
    setActiveExpectedHandling(source.expectedHandling);
    setIsRunning(true);
    setStatus("Processing");
    setAgentOutputs([]);
    setDecision(null);
    setStage(0);
    appendEvent(`Package entered conveyor: ${source.name}.`);

    const shouldContinue = () => runIdRef.current === runId;
    const steps = [
      { stage: 1, run: runGeographyAgent },
      { stage: 2, run: runCargoTypeAgent },
      { stage: 3, run: runSizeAgent },
      { stage: 4, run: runHandlingAgent },
    ];
    const nextOutputs: AgentOutput[] = [];

    for (const step of steps) {
      setStage(step.stage);
      await delay(currentDelay);
      if (!shouldContinue()) {
        return;
      }

      const output = step.run(packageSnapshot);
      nextOutputs.push(output);
      setAgentOutputs([...nextOutputs]);
      appendEvent(`${output.agent} completed: ${output.label}.`);
    }

    setStage(5);
    await delay(currentDelay);
    if (!shouldContinue()) {
      return;
    }

    const finalDecision = coordinatePackage(selectedStrategy, packageSnapshot, nextOutputs);
    setDecision(finalDecision);
    setStage(6);
    await delay(Math.max(120, currentDelay * 0.6));
    if (!shouldContinue()) {
      return;
    }
    setStage(7);
    setStatus("Completed");
    setIsRunning(false);
    updateScore(finalDecision, source);

    if (finalDecision.detectedConflicts.length > 0) {
      appendEvent(
        `Coordinator resolved conflict: ${finalDecision.detectedConflicts
          .map((conflict) => conflict.conflict)
          .join(", ")}.`,
      );
    } else {
      appendEvent("Coordinator completed routing without a conflict.");
    }

    appendEvent(`Package sent to final route: ${finalDecision.fullRoute.join(" -> ")}.`);
  };

  const applyPreset = (preset: DemoPackage) => {
    if (isRunning || isAutoProcessing) {
      return;
    }

    const nextPackage = clonePackage(preset.packageInfo);
    setPackageInfo(nextPackage);
    setDraftPackageName(preset.name);
    setDraftExpectedLane(preset.expectedLane);
    setDraftExpectedHub(preset.expectedHub);
    setDraftExpectedDepot(preset.expectedDepot);
    setDraftExpectedRoute(preset.expectedRoute);
    setDraftExpectedHandling(preset.expectedHandling);
    setActivePackage(nextPackage);
    setActivePackageName(preset.name);
    setActiveExpectedLane(preset.expectedLane);
    setActiveExpectedHub(preset.expectedHub);
    setActiveExpectedDepot(preset.expectedDepot);
    setActiveExpectedRoute(preset.expectedRoute);
    setActiveExpectedHandling(preset.expectedHandling);
    setAgentOutputs([]);
    setDecision(null);
    setStage(0);
    setStatus("Ready");
  };

  const handleStrategyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStrategy = event.target.value as CoordinationStrategy;
    setStrategy(nextStrategy);

    if (!isRunning && agentOutputs.length === 4) {
      const updatedDecision = coordinatePackage(nextStrategy, activePackage, agentOutputs);
      setDecision(updatedDecision);
      setStage(7);
      setStatus("Completed");
    }
  };

  const startSorting = () => {
    void runSortingForPackage(clonePackage(packageInfo), {
      name: draftPackageName,
      expectedLane: draftExpectedLane,
      expectedHub: draftExpectedHub,
      expectedDepot: draftExpectedDepot,
      expectedRoute: draftExpectedRoute,
      expectedHandling: draftExpectedHandling,
    });
  };

  const runQueuedPackage = async (
    queueSnapshot: QueuedPackage[],
    queueIndexSnapshot: number,
  ) => {
    if (queueSnapshot.length === 0) {
      return {
        nextQueue: queueSnapshot,
        nextIndex: queueIndexSnapshot,
      };
    }

    const [nextPackage, ...remainingQueue] = queueSnapshot;
    const replenishment = makeQueueItem(
      demoPackages[queueIndexSnapshot % demoPackages.length],
      queueIndexSnapshot,
    );
    const packageSnapshot = clonePackage(nextPackage.packageInfo);
    const nextQueue = [...remainingQueue, replenishment];
    const nextIndex = queueIndexSnapshot + 1;

    setPackageQueue(nextQueue);
    setNextQueueIndex(nextIndex);
    setPackageInfo(packageSnapshot);
    setDraftPackageName(nextPackage.name);
    setDraftExpectedLane(nextPackage.expectedLane);
    setDraftExpectedHub(nextPackage.expectedHub);
    setDraftExpectedDepot(nextPackage.expectedDepot);
    setDraftExpectedRoute(nextPackage.expectedRoute);
    setDraftExpectedHandling(nextPackage.expectedHandling);
    await runSortingForPackage(packageSnapshot, {
      name: nextPackage.name,
      expectedLane: nextPackage.expectedLane,
      expectedHub: nextPackage.expectedHub,
      expectedDepot: nextPackage.expectedDepot,
      expectedRoute: nextPackage.expectedRoute,
      expectedHandling: nextPackage.expectedHandling,
    });

    return {
      nextQueue,
      nextIndex,
    };
  };

  const processNextPackage = () => {
    if (isRunning || isAutoProcessing || packageQueue.length === 0) {
      return;
    }

    void runQueuedPackage(packageQueue, nextQueueIndex);
  };

  const startAutoProcessing = async () => {
    if (isRunning || isAutoProcessing || packageQueue.length === 0) {
      return;
    }

    autoRunRef.current = true;
    setIsAutoProcessing(true);
    appendEvent("Auto processing started.");

    let queueSnapshot = packageQueue;
    let queueIndexSnapshot = nextQueueIndex;

    while (autoRunRef.current) {
      const result = await runQueuedPackage(queueSnapshot, queueIndexSnapshot);
      queueSnapshot = result.nextQueue;
      queueIndexSnapshot = result.nextIndex;

      if (autoRunRef.current) {
        await delay(Math.max(250, currentDelay * 0.55));
      }
    }

    setIsAutoProcessing(false);
  };

  const stopAutoProcessing = () => {
    if (!isAutoProcessing) {
      return;
    }

    autoRunRef.current = false;
    setIsAutoProcessing(false);
    appendEvent("Auto processing stopped.");
  };

  const resetDemo = () => {
    const nextQueue = createInitialQueue();
    autoRunRef.current = false;
    runIdRef.current += 1;
    eventIdRef.current = 0;
    setIsAutoProcessing(false);
    setIsRunning(false);
    setStage(0);
    setAgentOutputs([]);
    setDecision(null);
    setStatus("Ready");
    setScore(initialScore);
    setEventLog([]);
    setPackageQueue(nextQueue);
    setNextQueueIndex(demoPackages.length);
    setPackageInfo(clonePackage(defaultPackage));
    setDraftPackageName(initialPreset.name);
    setDraftExpectedLane(initialPreset.expectedLane);
    setDraftExpectedHub(initialPreset.expectedHub);
    setDraftExpectedDepot(initialPreset.expectedDepot);
    setDraftExpectedRoute(initialPreset.expectedRoute);
    setDraftExpectedHandling(initialPreset.expectedHandling);
    setActivePackage(clonePackage(defaultPackage));
    setActivePackageName(initialPreset.name);
    setActiveExpectedLane(initialPreset.expectedLane);
    setActiveExpectedHub(initialPreset.expectedHub);
    setActiveExpectedDepot(initialPreset.expectedDepot);
    setActiveExpectedRoute(initialPreset.expectedRoute);
    setActiveExpectedHandling(initialPreset.expectedHandling);
  };

  const exportDecisionTrace = () => {
    if (!decision) {
      return;
    }

    const timestamp = new Date().toISOString();
    const trace = {
      timestamp,
      inputPackage: activePackage,
      packageName: activePackageName,
      selectedCoordinator: {
        key: strategy,
        label: decision.strategy,
      },
      specialistAgentOutputs: agentOutputs,
      detectedConflicts: decision.detectedConflicts,
      finalDecision: {
        strategy: decision.strategy,
        finalLane: decision.finalLane,
        finalHandlingLane: decision.finalHandlingLane,
        hub: decision.hub,
        depot: decision.depot,
        route: decision.route,
        fullRoute: decision.fullRoute,
        triggeredRules: decision.triggeredRules,
        scores: decision.scores ?? null,
      },
      expectedLane: activeExpectedLane,
      expectedHandling: activeExpectedHandling,
      expectedHub: activeExpectedHub,
      expectedDepot: activeExpectedDepot,
      expectedRoute: activeExpectedRoute,
      predictedVsExpected: {
        predictedLane: decision.finalLane,
        expectedLane: activeExpectedLane,
        predictedHandling: decision.finalHandlingLane,
        expectedHandling: activeExpectedHandling,
        predictedRoute: decision.route,
        expectedRoute: activeExpectedRoute,
        isCorrect: activeExpectedLane
          ? decision.finalLane === activeExpectedLane &&
            (!activeExpectedHub || decision.hub === activeExpectedHub) &&
            (!activeExpectedDepot || decision.depot === activeExpectedDepot) &&
            (!activeExpectedHandling || decision.finalHandlingLane === activeExpectedHandling)
          : null,
      },
      scoreSnapshot: score,
      eventLog: eventLog.map((entry) => entry.message),
      explanation: decision.explanation,
    };
    const blob = new Blob([JSON.stringify(trace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `decision-trace-${safeTimestampForFilename(timestamp)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Haoxuan Cheng 20621569</p>
          <h1>Intelligent Logistics Sorting Agent</h1>
          <p className="subtitle">Multi-agent coordination and conflict resolution demo</p>
        </div>
        <div className="status-stack" aria-live="polite">
          <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
          {isAutoProcessing && <span className="status-badge auto">Auto Mode</span>}
          {hasConflict && <span className="status-badge conflict">Conflict Detected</span>}
          {selectedLane === "MANUAL_REVIEW" && (
            <span className="status-badge manual">Manual Review</span>
          )}
        </div>
      </header>

      <section className="control-strip">
        <label className="select-field">
          Coordinator
          <select value={strategy} onChange={handleStrategyChange} disabled={isRunning || isAutoProcessing}>
            <option value="rule">{strategyLabels.rule}</option>
            <option value="weighted">{strategyLabels.weighted}</option>
            <option value="mediator">{strategyLabels.mediator}</option>
          </select>
        </label>

        <label className="speed-control">
          Speed
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={speedIndex}
            onChange={(event) => setSpeedIndex(Number(event.target.value))}
            disabled={isRunning || isAutoProcessing}
          />
          <span>{speedOptions[speedIndex].label}</span>
        </label>

        <label className="toggle-control">
          <input
            type="checkbox"
            checked={showReasoning}
            onChange={(event) => setShowReasoning(event.target.checked)}
          />
          Show reasoning
        </label>

        <div className="action-row">
          <button
            className="primary-action"
            onClick={processNextPackage}
            disabled={isRunning || isAutoProcessing || packageQueue.length === 0}
          >
            Process Next Package
          </button>
          <button
            className={`secondary-action auto-action ${isAutoProcessing ? "active" : ""}`}
            onClick={isAutoProcessing ? stopAutoProcessing : () => void startAutoProcessing()}
            disabled={!isAutoProcessing && (isRunning || packageQueue.length === 0)}
          >
            {isAutoProcessing ? "Stop Auto" : "Auto Process"}
          </button>
          <button className="secondary-action" onClick={startSorting} disabled={isRunning || isAutoProcessing}>
            Start Sorting
          </button>
          <button className="secondary-action" onClick={resetDemo}>
            Reset
          </button>
          <button
            className="secondary-action export-action"
            onClick={exportDecisionTrace}
            disabled={isRunning || isAutoProcessing || !decision}
          >
            Export Decision Trace
          </button>
        </div>
      </section>

      <section className="game-grid" aria-label="Simulation score and event log">
        <div className="score-panel">
          <div className="section-heading">
            <div>
              <h2>Score Panel</h2>
              <p>Run outcomes for preset ground-truth packages</p>
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Processed</span>
              <strong>{score.packagesProcessed}</strong>
            </div>
            <div className="metric-card">
              <span>Correct</span>
              <strong>
                {score.correctDecisions}/{score.scoredPackages}
              </strong>
            </div>
            <div className="metric-card">
              <span>Manual Review</span>
              <strong>{score.manualReviewCount}</strong>
            </div>
            <div className="metric-card">
              <span>Conflicts</span>
              <strong>{score.conflictCount}</strong>
            </div>
          </div>
        </div>

        <div className="event-log-panel">
          <div className="section-heading">
            <div>
              <h2>Event Log</h2>
              <p>{eventLog.length} recent events</p>
            </div>
          </div>
          {eventLog.length === 0 ? (
            <div className="empty-state compact-empty">No package events yet.</div>
          ) : (
            <ol className="event-log">
              {eventLog.map((entry) => (
                <li key={entry.id}>{entry.message}</li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="layout-grid">
        <section className="input-panel" aria-labelledby="package-form-title">
          <div className="section-heading">
            <div>
              <h2 id="package-form-title">Package Input</h2>
              <p>{volume.toLocaleString()} cm3 estimated volume</p>
            </div>
          </div>

          <div className="preset-row">
            {demoPackages.map((preset) => (
              <button
                key={preset.id}
                className="preset-button"
                type="button"
                onClick={() => applyPreset(preset)}
                disabled={isRunning || isAutoProcessing}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <form className="package-form">
            <label className="wide-field">
              Recipient address
              <input
                value={packageInfo.addressLine}
                onChange={setTextField("addressLine")}
                placeholder="Canary Wharf, East London"
              />
            </label>

            <label>
              Recipient city
              <input
                value={packageInfo.city}
                onChange={setTextField("city")}
                placeholder="London"
              />
            </label>

            <label>
              Postcode
              <input
                value={packageInfo.postcode}
                onChange={setTextField("postcode")}
                placeholder="E14 5AB"
              />
            </label>

            <label className="wide-field">
              Cargo description
              <textarea
                value={packageInfo.cargoDescription}
                onChange={setTextField("cargoDescription")}
                placeholder="legal documents"
                rows={3}
              />
            </label>

            <label>
              Length (cm)
              <input
                type="number"
                min="0"
                value={packageInfo.length}
                onChange={setNumberField("length")}
              />
            </label>

            <label>
              Width (cm)
              <input
                type="number"
                min="0"
                value={packageInfo.width}
                onChange={setNumberField("width")}
              />
            </label>

            <label>
              Height (cm)
              <input
                type="number"
                min="0"
                value={packageInfo.height}
                onChange={setNumberField("height")}
              />
            </label>

            <label>
              Weight (kg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={packageInfo.weight}
                onChange={setNumberField("weight")}
              />
            </label>

            <div className="flag-row wide-field">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={packageInfo.fragile}
                  onChange={setBooleanField("fragile")}
                />
                Fragile
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={packageInfo.coldChain}
                  onChange={setBooleanField("coldChain")}
                />
                Cold-chain
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={packageInfo.priority}
                  onChange={setBooleanField("priority")}
                />
                Priority
              </label>
            </div>
          </form>

          <div className="queue-box">
            <div className="queue-title-row">
              <h3>Input Queue</h3>
              <span>{packageQueue.length} waiting</span>
            </div>
            <div className="queue-list">
              {packageQueue.map((queuedPackage, index) => (
                <article
                  className={`queue-card ${index === 0 ? "next" : ""}`}
                  key={queuedPackage.queueId}
                >
                  <span>{index === 0 ? "Next" : `#${index + 1}`}</span>
                  <strong>{queuedPackage.name}</strong>
                  <small>
                    {queuedPackage.packageInfo.postcode}
                    {" -> "}
                    {queuedPackage.expectedDepot}
                  </small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="simulation-panel" aria-labelledby="simulation-title">
          <div className="section-heading">
            <div>
              <h2 id="simulation-title">Sorting Centre</h2>
              <p>
                {activePackageName} at {currentStation}
              </p>
            </div>
            <span className="status-badge processing">{isRunning ? "Processing" : status}</span>
          </div>

          <div className="conveyor" aria-label="Sorting centre conveyor">
            <div className="belt-line" />
            <div className="parcel" style={parcelStyle} aria-label="Package parcel">
              <span className="parcel-icon" aria-hidden="true">
                PKG
              </span>
              <span className="parcel-label">{activePackage.postcode || "Package"}</span>
            </div>

            <div className="station-row">
              {stations.map((station, index) => {
                const isCurrent = index === stage;
                const isComplete = index < stage || (index === 7 && Boolean(decision));

                return (
                  <div
                    key={station}
                    className={`station ${isCurrent ? "current" : ""} ${
                      isComplete ? "complete" : ""
                    }`}
                  >
                    <span className="station-index">{index}</span>
                    <span>{station}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lane-sections" aria-label="Final sorting lanes">
            <div>
              <h3>Special lanes</h3>
              <div className="lane-grid">
                {specialLanes.map((lane) => (
                  <div
                    key={lane}
                    className={`lane-tile ${selectedLane === lane ? "selected" : ""} ${
                      lane === "MANUAL_REVIEW" ? "manual-lane" : ""
                    }`}
                  >
                    <span className="lane-code">{lane}</span>
                    {selectedLane === lane && <span className="lane-selected">Selected</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3>Active delivery depot lane</h3>
              <div className="active-depot-grid">
                {activeDepotLane ? (
                  <div
                    className={`lane-tile depot-lane ${
                      selectedLane === activeDepotLane ? "selected" : "route-active"
                    }`}
                  >
                    <span className="lane-code">{activeDepotLane}</span>
                    <span className="lane-selected">
                      {selectedLane === activeDepotLane ? "Selected" : "Onward route"}
                    </span>
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    Depot lane appears after the Geography Agent runs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="results-grid">
        <div className="output-panel">
          <div className="section-heading">
            <div>
              <h2>Agent Outputs</h2>
              <p>{agentOutputs.length}/4 specialist agents completed</p>
            </div>
          </div>

          <div className="agent-card-grid">
            {agentOutputs.length === 0 && (
              <div className="empty-state">
                Waiting for the package to reach the first specialist agent.
              </div>
            )}

            {agentOutputs.map((output) => (
              <article className="agent-card" key={output.agent}>
                <div className="card-title-row">
                  <h3>{output.agent}</h3>
                  <span className="confidence-pill">{formatConfidence(output.confidence)}</span>
                </div>
                <dl>
                  <div>
                    <dt>Input</dt>
                    <dd>{output.inputUsed}</dd>
                  </div>
                  <div>
                    <dt>Prediction</dt>
                    <dd>{output.label}</dd>
                  </div>
                  {output.postcodeArea && (
                    <div>
                      <dt>Postcode area</dt>
                      <dd>{output.postcodeArea}</dd>
                    </div>
                  )}
                  {output.hub && (
                    <div>
                      <dt>Hub</dt>
                      <dd>{output.hub}</dd>
                    </div>
                  )}
                  {output.depot && (
                    <div>
                      <dt>Depot</dt>
                      <dd>{output.depot}</dd>
                    </div>
                  )}
                  {output.route && (
                    <div>
                      <dt>Route</dt>
                      <dd>{output.route.join(" -> ")}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Suggested lane</dt>
                    <dd>{output.suggestedLane ?? "None"}</dd>
                  </div>
                </dl>
                {showReasoning && (
                  <>
                    <div className="confidence-meter" aria-hidden="true">
                      <span style={{ width: `${output.confidence * 100}%` }} />
                    </div>
                    <p>{output.explanation}</p>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>

        <div className="coordinator-panel">
          <div className="section-heading">
            <div>
              <h2>Coordinator Decision</h2>
              <p>{decision ? decision.strategy : strategyLabels[strategy]}</p>
            </div>
          </div>

          {!decision && (
            <div className="empty-state">
              Coordinator output appears after all specialist agents finish.
            </div>
          )}

          {decision && (
            <div className="decision-stack">
              <div className="final-decision">
                <span>Final handling lane</span>
                <strong>{decision.finalHandlingLane}</strong>
              </div>

              <div className="lane-comparison">
                <div>
                  <span>Predicted final lane</span>
                  <strong>{decision.finalLane}</strong>
                </div>
                <div>
                  <span>Expected lane</span>
                  <strong>{activeExpectedLane ?? "Not available"}</strong>
                </div>
                <div>
                  <span>Expected handling</span>
                  <strong>{activeExpectedHandling ?? "Not available"}</strong>
                </div>
                {activeExpectedLane && (
                  <span
                    className={`match-pill ${
                      decision.finalLane === activeExpectedLane &&
                      (!activeExpectedHub || decision.hub === activeExpectedHub) &&
                      (!activeExpectedDepot || decision.depot === activeExpectedDepot) &&
                      (!activeExpectedHandling || decision.finalHandlingLane === activeExpectedHandling)
                        ? "correct"
                        : "incorrect"
                    }`}
                  >
                    {decision.finalLane === activeExpectedLane &&
                    (!activeExpectedHub || decision.hub === activeExpectedHub) &&
                    (!activeExpectedDepot || decision.depot === activeExpectedDepot) &&
                    (!activeExpectedHandling || decision.finalHandlingLane === activeExpectedHandling)
                      ? "Correct"
                      : "Mismatch"}
                  </span>
                )}
              </div>

              <div className="route-summary">
                <div>
                  <span>Hub</span>
                  <strong>{decision.hub}</strong>
                </div>
                <div>
                  <span>Depot</span>
                  <strong>{decision.depot}</strong>
                </div>
                <div className="wide-route">
                  <span>Full route</span>
                  <strong>{decision.fullRoute.join(" -> ")}</strong>
                </div>
                {activeExpectedRoute && (
                  <div className="wide-route">
                    <span>Expected route</span>
                    <strong>{activeExpectedRoute.join(" -> ")}</strong>
                  </div>
                )}
              </div>

              {showReasoning && <p className="decision-explanation">{decision.explanation}</p>}

              {showReasoning && (
                <div>
                  <h3>Triggered rules</h3>
                  <ul className="compact-list">
                    {decision.triggeredRules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              {showReasoning && decision.scores && (
                <div>
                  <h3>Weighted scores</h3>
                  <div className="score-grid">
                    {Object.entries(decision.scores).map(([lane, scoreValue]) => (
                      <span key={lane}>
                        {lane}: {scoreValue.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3>Detected conflicts</h3>
                {decision.detectedConflicts.length === 0 ? (
                  <p className="no-conflict">No lane conflict detected.</p>
                ) : (
                  <div className="conflict-list">
                    {decision.detectedConflicts.map((conflict) => (
                      <article className="conflict-card" key={conflict.conflict}>
                        <strong>Detected conflict: {conflict.conflict}</strong>
                        {showReasoning && (
                          <>
                            <p>{conflict.detail}</p>
                            <span>Resolution: {conflict.resolution}</span>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
