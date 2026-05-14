export type Lane =
  | "COLD_CHAIN"
  | "FRAGILE"
  | "OVERSIZED"
  | "EXPRESS"
  | "STANDARD"
  | "MANUAL_REVIEW"
  | "DEPOT_EAST_LONDON"
  | "DEPOT_CENTRAL_LONDON"
  | "DEPOT_NORTH_LONDON"
  | "DEPOT_NORTH_WEST_LONDON"
  | "DEPOT_SOUTH_EAST_LONDON"
  | "DEPOT_SOUTH_WEST_LONDON"
  | "DEPOT_WEST_LONDON"
  | "DEPOT_BROMLEY"
  | "DEPOT_CROYDON"
  | "DEPOT_NOTTINGHAM"
  | "DEPOT_LEICESTER"
  | "DEPOT_DERBY"
  | "DEPOT_LINCOLN"
  | "DEPOT_BIRMINGHAM"
  | "DEPOT_COVENTRY"
  | "DEPOT_STOKE_ON_TRENT"
  | "DEPOT_WALSALL"
  | "DEPOT_MANCHESTER"
  | "DEPOT_LIVERPOOL"
  | "DEPOT_PRESTON"
  | "DEPOT_LANCASTER"
  | "DEPOT_SHEFFIELD"
  | "DEPOT_LEEDS"
  | "DEPOT_YORK"
  | "DEPOT_HULL"
  | "DEPOT_NEWCASTLE"
  | "DEPOT_DURHAM"
  | "DEPOT_SUNDERLAND"
  | "DEPOT_OXFORD"
  | "DEPOT_READING"
  | "DEPOT_SOUTHAMPTON"
  | "DEPOT_BRIGHTON"
  | "DEPOT_GUILDFORD"
  | "DEPOT_TUNBRIDGE_WELLS"
  | "DEPOT_BRISTOL"
  | "DEPOT_EXETER"
  | "DEPOT_PLYMOUTH"
  | "DEPOT_TRURO"
  | "DEPOT_BATH"
  | "DEPOT_NORWICH"
  | "DEPOT_CAMBRIDGE"
  | "DEPOT_IPSWICH"
  | "DEPOT_PETERBOROUGH"
  | "DEPOT_CHELMSFORD"
  | "DEPOT_EDINBURGH"
  | "DEPOT_GLASGOW"
  | "DEPOT_ABERDEEN"
  | "DEPOT_DUNDEE"
  | "DEPOT_INVERNESS"
  | "DEPOT_CARDIFF"
  | "DEPOT_SWANSEA"
  | "DEPOT_NORTH_WALES"
  | "DEPOT_NEWPORT"
  | "DEPOT_BELFAST";

export type CoordinationStrategy = "rule" | "weighted" | "mediator";

export type PackageInfo = {
  addressLine: string;
  city: string;
  postcode: string;
  cargoDescription: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  fragile: boolean;
  coldChain: boolean;
  priority: boolean;
};

export type AgentOutput = {
  agent: string;
  inputUsed: string;
  label: string;
  hub?: string;
  depot?: string;
  postcodeArea?: string;
  route?: string[];
  confidence: number;
  suggestedLane: Lane | null;
  suggestedLanes?: Lane[];
  explanation: string;
};

export type TriggeredLane = {
  lane: Lane;
  source: string;
  confidence: number;
  reason: string;
};

export type Conflict = {
  conflict: string;
  detail: string;
  resolution: string;
};

export type CoordinatorDecision = {
  strategy: string;
  triggeredRules: string[];
  detectedConflicts: Conflict[];
  finalLane: Lane;
  finalHandlingLane: Lane | "NORMAL";
  hub: string;
  depot: string;
  route: string[];
  fullRoute: string[];
  explanation: string;
  scores?: Partial<Record<Lane, number>>;
};

export const specialLanes: Lane[] = [
  "COLD_CHAIN",
  "FRAGILE",
  "OVERSIZED",
  "EXPRESS",
  "STANDARD",
  "MANUAL_REVIEW",
];

export const depotLanes: Lane[] = [
  "DEPOT_EAST_LONDON",
  "DEPOT_CENTRAL_LONDON",
  "DEPOT_NORTH_LONDON",
  "DEPOT_NORTH_WEST_LONDON",
  "DEPOT_SOUTH_EAST_LONDON",
  "DEPOT_SOUTH_WEST_LONDON",
  "DEPOT_WEST_LONDON",
  "DEPOT_BROMLEY",
  "DEPOT_CROYDON",
  "DEPOT_NOTTINGHAM",
  "DEPOT_LEICESTER",
  "DEPOT_DERBY",
  "DEPOT_LINCOLN",
  "DEPOT_BIRMINGHAM",
  "DEPOT_COVENTRY",
  "DEPOT_STOKE_ON_TRENT",
  "DEPOT_WALSALL",
  "DEPOT_MANCHESTER",
  "DEPOT_LIVERPOOL",
  "DEPOT_PRESTON",
  "DEPOT_LANCASTER",
  "DEPOT_SHEFFIELD",
  "DEPOT_LEEDS",
  "DEPOT_YORK",
  "DEPOT_HULL",
  "DEPOT_NEWCASTLE",
  "DEPOT_DURHAM",
  "DEPOT_SUNDERLAND",
  "DEPOT_OXFORD",
  "DEPOT_READING",
  "DEPOT_SOUTHAMPTON",
  "DEPOT_BRIGHTON",
  "DEPOT_GUILDFORD",
  "DEPOT_TUNBRIDGE_WELLS",
  "DEPOT_BRISTOL",
  "DEPOT_EXETER",
  "DEPOT_PLYMOUTH",
  "DEPOT_TRURO",
  "DEPOT_BATH",
  "DEPOT_NORWICH",
  "DEPOT_CAMBRIDGE",
  "DEPOT_IPSWICH",
  "DEPOT_PETERBOROUGH",
  "DEPOT_CHELMSFORD",
  "DEPOT_EDINBURGH",
  "DEPOT_GLASGOW",
  "DEPOT_ABERDEEN",
  "DEPOT_DUNDEE",
  "DEPOT_INVERNESS",
  "DEPOT_CARDIFF",
  "DEPOT_SWANSEA",
  "DEPOT_NORTH_WALES",
  "DEPOT_NEWPORT",
  "DEPOT_BELFAST",
];

export const lanes: Lane[] = [...specialLanes, ...depotLanes];

export const strategyLabels: Record<CoordinationStrategy, string> = {
  rule: "Rule-based Coordinator",
  weighted: "Weighted Voting Coordinator",
  mediator: "Mediator / Blackboard Coordinator",
};
