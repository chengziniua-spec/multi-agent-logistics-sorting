# Intelligent Logistics Sorting Agent

This visual demo is a browser-based companion to the COMP3004/4105 coursework project, **Coordination and Conflict Resolution in a Multi-Agent Intelligent Logistics Sorting System**.

It demonstrates how one package moves through a sorting centre, visits four specialist intelligent agents, and is then routed by a selected coordinator strategy. The app is intentionally self-contained: all simulation logic runs in the frontend and no backend server or external API is required.

## What The Demo Shows

- A package input form for destination, cargo, size, weight, and handling flags.
- Preset package examples, including a conflict-heavy Nottingham food cold-chain priority case.
- A deterministic input queue of UK-wide preset packages for simple simulation-game style processing.
- A score panel tracking processed packages, correct decisions for preset ground truth, manual review decisions, and conflicts.
- An event log showing each package moving through the agent pipeline.
- A conveyor-belt style sorting line:
  `Input -> Geography Agent -> Cargo Type Agent -> Size Agent -> Handling Agent -> Coordinator -> Hub -> Depot`
- Animated movement of a parcel through each station.
- Specialist agent reasoning cards with input used, prediction, confidence, suggested lane, and explanation.
- A coordinator decision panel showing strategy, triggered rules, detected conflicts, final lane, and explanation.
- Predicted lane vs expected lane for preset packages with ground-truth lanes.
- UK postcode-area parsing, address fallback, and hub-to-depot logistics routing.
- Special handling lanes plus the active delivery depot lane for the current package.

## Install And Run

From this folder:

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

To create a production build:

```bash
npm run build
```

To run the visual demo postcode parser tests:

```bash
npm run test:geography
```

## How To Use

1. Enter package information or choose one of the preset buttons.
2. Select a coordinator strategy:
   - Rule-based Coordinator
   - Weighted Voting Coordinator
   - Mediator / Blackboard Coordinator
3. Choose the animation speed.
4. Click **Process Next Package** to process the next queued preset package, or click **Start Sorting** to process the form package.
5. Watch the package move through the agents and into the final lane.
6. Use **Show reasoning** to toggle explanation detail on or off.
7. Change the coordinator strategy after a run to compare final decisions.
8. Click **Export Decision Trace** after a run to download JSON evidence for the coursework report.

## Ground Truth And Scoring

Preset packages include expected final lanes and expected routes:

- East London package -> `DEPOT_EAST_LONDON`, `London Sorting Centre -> East London Delivery Depot`
- Central London package -> `DEPOT_CENTRAL_LONDON`, `London Sorting Centre -> Central London Delivery Depot`
- Nottingham food package -> `DEPOT_NOTTINGHAM`, `East Midlands Sorting Centre -> Nottingham Delivery Depot`
- Cardiff medicine cold-chain -> `COLD_CHAIN`, `Wales Sorting Centre -> Cardiff Delivery Depot`
- Manchester fragile electronics -> `FRAGILE`, `North West Sorting Centre -> Manchester Delivery Depot`
- Conflict-heavy package -> `COLD_CHAIN`, `East Midlands Sorting Centre -> Nottingham Delivery Depot`

The score panel counts correct decisions only when ground truth is available. Custom edited packages are still processed deterministically, but they are not counted as scored ground-truth cases.

## Exported Decision Trace

The exported JSON file includes:

- input package
- selected coordinator
- all specialist agent outputs
- detected conflicts
- final decision
- expected lane, expected handling, route, and predicted-vs-expected comparison when available
- explanation
- timestamp

## Specialist Agents

### UK Geography Agent

Uses the postcode area to infer a main sorting centre, local delivery depot, and route. It matches the longest known prefix first, so overlapping London prefixes are handled correctly:

- `E14 5AB` -> `London Sorting Centre -> East London Delivery Depot`
- `EC1A 1BB` -> `London Sorting Centre -> Central London Delivery Depot`
- `SW1A 1AA` -> `London Sorting Centre -> South West London Delivery Depot`
- `NG7 2RD` -> `East Midlands Sorting Centre -> Nottingham Delivery Depot`

If the postcode area is unknown, the agent falls back to deterministic address/city keywords such as East London, Nottingham, Manchester, Cardiff, and Edinburgh with lower confidence. If no route can be inferred, it uses manual routing.

### Cargo Type Agent

Uses keyword matching to classify cargo as Food, Electronics, Clothing, Documents, Medicine, or General Goods.

### Size Agent

Computes volume as:

```text
length * width * height
```

If volume is above `200000 cm3` or weight is above `20 kg`, the agent suggests `OVERSIZED`.

### Handling Agent

Checks handling flags in this order:

1. Cold-chain -> `COLD_CHAIN`
2. Fragile -> `FRAGILE`
3. Priority -> `EXPRESS`
4. Otherwise Normal

## Coordinator Strategies

### Rule-based Coordinator

Applies a fixed priority order:

1. Cold-chain -> `COLD_CHAIN`
2. Fragile -> `FRAGILE`
3. Priority -> `EXPRESS`
4. Oversized -> `OVERSIZED`
5. Normal hub-to-depot route, such as `DEPOT_EAST_LONDON` or `DEPOT_NOTTINGHAM`
6. Otherwise `MANUAL_REVIEW`

### Weighted Voting Coordinator

Creates scores for candidate lanes:

- Handling Agent suggestions use weight `1.5`.
- Size Agent suggestions use weight `1.2`.
- Geography route suggestions add a score to depot lanes.
- The lane with the highest score is selected.

### Mediator / Blackboard Coordinator

Collects all specialist outputs on a shared blackboard, detects conflicts, checks uncertainty, and applies safety-critical routing first:

1. Cold-chain
2. Fragile
3. Priority
4. Oversized

If two or more specialist agents have confidence below `0.60`, the package is routed to `MANUAL_REVIEW`.

## Conflict Visualisation

When multiple possible handling lanes are triggered, the coordinator panel displays conflicts such as:

- `COLD_CHAIN vs EXPRESS`
- `OVERSIZED vs EXPRESS`

Each conflict card shows the detected conflict and explains how the selected coordinator resolved it while preserving the onward hub-to-depot route.
