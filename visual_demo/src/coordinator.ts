import type {
  AgentOutput,
  Conflict,
  CoordinationStrategy,
  CoordinatorDecision,
  Lane,
  PackageInfo,
  TriggeredLane,
} from "./types";
import { depotLanes, lanes, strategyLabels } from "./types";

const laneDescriptions: Record<Lane, string> = {
  COLD_CHAIN: "temperature-controlled cold-chain handling",
  FRAGILE: "fragile handling",
  OVERSIZED: "oversized handling",
  EXPRESS: "express priority handling",
  STANDARD: "standard sorting",
  MANUAL_REVIEW: "manual review",
  DEPOT_EAST_LONDON: "East London Delivery Depot",
  DEPOT_CENTRAL_LONDON: "Central London Delivery Depot",
  DEPOT_NORTH_LONDON: "North London Delivery Depot",
  DEPOT_NORTH_WEST_LONDON: "North West London Delivery Depot",
  DEPOT_SOUTH_EAST_LONDON: "South East London Delivery Depot",
  DEPOT_SOUTH_WEST_LONDON: "South West London Delivery Depot",
  DEPOT_WEST_LONDON: "West London Delivery Depot",
  DEPOT_BROMLEY: "Bromley Delivery Depot",
  DEPOT_CROYDON: "Croydon Delivery Depot",
  DEPOT_NOTTINGHAM: "Nottingham Delivery Depot",
  DEPOT_LEICESTER: "Leicester Delivery Depot",
  DEPOT_DERBY: "Derby Delivery Depot",
  DEPOT_LINCOLN: "Lincoln Delivery Depot",
  DEPOT_BIRMINGHAM: "Birmingham Delivery Depot",
  DEPOT_COVENTRY: "Coventry Delivery Depot",
  DEPOT_STOKE_ON_TRENT: "Stoke-on-Trent Delivery Depot",
  DEPOT_WALSALL: "Walsall Delivery Depot",
  DEPOT_MANCHESTER: "Manchester Delivery Depot",
  DEPOT_LIVERPOOL: "Liverpool Delivery Depot",
  DEPOT_PRESTON: "Preston Delivery Depot",
  DEPOT_LANCASTER: "Lancaster Delivery Depot",
  DEPOT_SHEFFIELD: "Sheffield Delivery Depot",
  DEPOT_LEEDS: "Leeds Delivery Depot",
  DEPOT_YORK: "York Delivery Depot",
  DEPOT_HULL: "Hull Delivery Depot",
  DEPOT_NEWCASTLE: "Newcastle Delivery Depot",
  DEPOT_DURHAM: "Durham Delivery Depot",
  DEPOT_SUNDERLAND: "Sunderland Delivery Depot",
  DEPOT_OXFORD: "Oxford Delivery Depot",
  DEPOT_READING: "Reading Delivery Depot",
  DEPOT_SOUTHAMPTON: "Southampton Delivery Depot",
  DEPOT_BRIGHTON: "Brighton Delivery Depot",
  DEPOT_GUILDFORD: "Guildford Delivery Depot",
  DEPOT_TUNBRIDGE_WELLS: "Tunbridge Wells Delivery Depot",
  DEPOT_BRISTOL: "Bristol Delivery Depot",
  DEPOT_EXETER: "Exeter Delivery Depot",
  DEPOT_PLYMOUTH: "Plymouth Delivery Depot",
  DEPOT_TRURO: "Truro Delivery Depot",
  DEPOT_BATH: "Bath Delivery Depot",
  DEPOT_NORWICH: "Norwich Delivery Depot",
  DEPOT_CAMBRIDGE: "Cambridge Delivery Depot",
  DEPOT_IPSWICH: "Ipswich Delivery Depot",
  DEPOT_PETERBOROUGH: "Peterborough Delivery Depot",
  DEPOT_CHELMSFORD: "Chelmsford Delivery Depot",
  DEPOT_EDINBURGH: "Edinburgh Delivery Depot",
  DEPOT_GLASGOW: "Glasgow Delivery Depot",
  DEPOT_ABERDEEN: "Aberdeen Delivery Depot",
  DEPOT_DUNDEE: "Dundee Delivery Depot",
  DEPOT_INVERNESS: "Inverness Delivery Depot",
  DEPOT_CARDIFF: "Cardiff Delivery Depot",
  DEPOT_SWANSEA: "Swansea Delivery Depot",
  DEPOT_NORTH_WALES: "North Wales Delivery Depot",
  DEPOT_NEWPORT: "Newport Delivery Depot",
  DEPOT_BELFAST: "Belfast Delivery Depot",
};

const handlingPriority: Lane[] = ["COLD_CHAIN", "FRAGILE", "EXPRESS", "OVERSIZED"];
const conflictOrder: Lane[] = ["COLD_CHAIN", "FRAGILE", "EXPRESS", "OVERSIZED"];

const handlingRoutePrefix: Partial<Record<Lane, string>> = {
  COLD_CHAIN: "Cold-chain handling",
  FRAGILE: "Fragile handling",
  EXPRESS: "Express handling",
  OVERSIZED: "Oversized handling",
};

const byAgent = (outputs: AgentOutput[], name: string) =>
  outputs.find((output) => output.agent === name);

const addScore = (
  scores: Partial<Record<Lane, number>>,
  lane: Lane,
  value: number,
) => {
  scores[lane] = (scores[lane] ?? 0) + value;
};

const formatScore = (score: number) => score.toFixed(2);

const isDepotLane = (lane: Lane) => depotLanes.includes(lane);

function getGeography(outputs: AgentOutput[]) {
  return byAgent(outputs, "Geography Agent");
}

function getNormalRoute(outputs: AgentOutput[]) {
  const geography = getGeography(outputs);
  return {
    hub: geography?.hub ?? "Manual Routing",
    depot: geography?.depot ?? "Unknown Depot",
    route: geography?.route ?? ["Manual Routing"],
    depotLane: geography?.suggestedLane && isDepotLane(geography.suggestedLane)
      ? geography.suggestedLane
      : null,
  };
}

function collectTriggeredLanes(outputs: AgentOutput[]): TriggeredLane[] {
  const geography = getGeography(outputs);
  const triggered: TriggeredLane[] = [];

  outputs.forEach((output) => {
    if (output.agent === "Geography Agent" || output.agent === "Cargo Type Agent") {
      return;
    }

    const suggested = output.suggestedLanes ?? (output.suggestedLane ? [output.suggestedLane] : []);
    suggested.forEach((lane) => {
      triggered.push({
        lane,
        source: output.agent,
        confidence: output.confidence,
        reason: output.explanation,
      });
    });
  });

  if (geography?.suggestedLane && isDepotLane(geography.suggestedLane)) {
    triggered.push({
      lane: geography.suggestedLane,
      source: "Geography Agent",
      confidence: geography.confidence,
      reason: `Normal route is ${geography.route?.join(" -> ") ?? geography.depot}.`,
    });
  }

  return triggered;
}

function triggeredRuleText(triggered: TriggeredLane[]) {
  if (triggered.length === 0) {
    return ["No known geography or handling route was triggered; manual review is required."];
  }

  return triggered.map(
    (item) =>
      `${item.source} triggered ${item.lane} (${Math.round(
        item.confidence * 100,
      )}% confidence).`,
  );
}

function chooseByPriority(triggered: TriggeredLane[]) {
  const triggeredLanes = new Set(triggered.map((item) => item.lane));

  for (const lane of handlingPriority) {
    if (triggeredLanes.has(lane)) {
      return lane;
    }
  }

  return depotLanes.find((lane) => triggeredLanes.has(lane)) ?? "MANUAL_REVIEW";
}

function buildConflict(triggered: TriggeredLane[], finalLane: Lane, strategy: string): Conflict[] {
  const uniqueLanes = Array.from(new Set(triggered.map((item) => item.lane)));
  const conflictLanes = conflictOrder.filter((lane) => uniqueLanes.includes(lane));

  if (conflictLanes.length <= 1) {
    return [];
  }

  const hasColdChainOverride = conflictLanes.includes("COLD_CHAIN") && finalLane === "COLD_CHAIN";
  return [
    {
      conflict: conflictLanes.join(" vs "),
      detail: "The package triggered multiple handling constraints.",
      resolution: hasColdChainOverride
        ? "COLD_CHAIN overrides due to safety priority, while the geographical route remains unchanged."
        : `${strategy} selected ${finalLane}: ${laneDescriptions[finalLane]}.`,
    },
  ];
}

function buildDecision(
  strategy: string,
  triggered: TriggeredLane[],
  finalLane: Lane,
  outputs: AgentOutput[],
  explanation: string,
  scores?: Partial<Record<Lane, number>>,
): CoordinatorDecision {
  const routeInfo = getNormalRoute(outputs);
  const routePrefix = handlingRoutePrefix[finalLane];
  const fullRoute = routePrefix ? [routePrefix, ...routeInfo.route] : routeInfo.route;
  const finalHandlingLane = isDepotLane(finalLane) ? "NORMAL" : finalLane;

  return {
    strategy,
    triggeredRules: triggeredRuleText(triggered),
    detectedConflicts: buildConflict(triggered, finalLane, strategy),
    finalLane,
    finalHandlingLane,
    hub: routeInfo.hub,
    depot: routeInfo.depot,
    route: routeInfo.route,
    fullRoute,
    scores,
    explanation,
  };
}

function coordinateWithRules(outputs: AgentOutput[]): CoordinatorDecision {
  const triggered = collectTriggeredLanes(outputs);
  const finalLane = chooseByPriority(triggered);
  const strategy = strategyLabels.rule;
  const explanation = isDepotLane(finalLane)
    ? `No higher-priority handling rule applied, so the normal depot route is used: ${laneDescriptions[finalLane]}.`
    : `${finalLane} was selected before the normal route because special handling rules have priority.`;

  return buildDecision(strategy, triggered, finalLane, outputs, explanation);
}

function coordinateWithWeightedVoting(outputs: AgentOutput[]): CoordinatorDecision {
  const triggered = collectTriggeredLanes(outputs);
  const scores: Partial<Record<Lane, number>> = {};
  const strategy = strategyLabels.weighted;

  triggered.forEach((item) => {
    const weight = item.source === "Handling Agent" ? 1.5 : 1.0;
    addScore(scores, item.lane, item.confidence * weight);
  });

  if (Object.keys(scores).length === 0) {
    addScore(scores, "MANUAL_REVIEW", 0.5);
  }

  const finalLane = lanes
    .filter((lane) => scores[lane] !== undefined)
    .sort((laneA, laneB) => {
      const scoreDifference = (scores[laneB] ?? 0) - (scores[laneA] ?? 0);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const laneAPriority = handlingPriority.indexOf(laneA);
      const laneBPriority = handlingPriority.indexOf(laneB);
      return (laneAPriority === -1 ? 99 : laneAPriority) - (laneBPriority === -1 ? 99 : laneBPriority);
    })[0];
  const explanation = `${finalLane} has the highest weighted score (${formatScore(
    scores[finalLane] ?? 0,
  )}), while the geographical route remains available for onward delivery.`;

  return buildDecision(strategy, triggered, finalLane, outputs, explanation, scores);
}

function coordinateWithMediator(outputs: AgentOutput[]): CoordinatorDecision {
  const triggered = collectTriggeredLanes(outputs);
  const lowConfidence = outputs.filter((output) => output.confidence < 0.6);
  const strategy = strategyLabels.mediator;

  if (lowConfidence.length >= 2) {
    return buildDecision(
      strategy,
      triggered,
      "MANUAL_REVIEW",
      outputs,
      "Two or more specialist agents are below 60% confidence, so the package is sent to manual review.",
    );
  }

  const finalLane = chooseByPriority(triggered);
  const explanation = isDepotLane(finalLane)
    ? "The mediator found no special handling override, so it accepts the normal hub-to-depot route."
    : `${finalLane} is the highest-priority handling rule on the blackboard.`;

  return buildDecision(strategy, triggered, finalLane, outputs, explanation);
}

export function coordinatePackage(
  strategy: CoordinationStrategy,
  _pkg: PackageInfo,
  outputs: AgentOutput[],
): CoordinatorDecision {
  if (strategy === "weighted") {
    return coordinateWithWeightedVoting(outputs);
  }

  if (strategy === "mediator") {
    return coordinateWithMediator(outputs);
  }

  return coordinateWithRules(outputs);
}
