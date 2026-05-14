from typing import Any, Dict, Iterable, List, Optional, Sequence


class Coordinator:
    def __init__(self, agents: List[object]):
        self.agents = agents

    def dispatch(self, packages: List[Dict[str, str]]) -> Dict[str, Dict[str, str]]:
        assignments = {}
        for agent in self.agents:
            package = agent.choose_package(packages)
            if package:
                assignments[agent.name] = package
                packages.remove(package)
        return assignments


LOGISTICS_PRIORITY = [
    "COLD_CHAIN",
    "FRAGILE",
    "EXPRESS",
    "OVERSIZED",
]

HANDLING_ROUTE_PREFIX = {
    "COLD_CHAIN": "Cold-chain handling",
    "FRAGILE": "Fragile handling",
    "EXPRESS": "Express handling",
    "OVERSIZED": "Oversized handling",
}


LANE_DESCRIPTIONS = {
    "COLD_CHAIN": "temperature-controlled cold-chain handling",
    "FRAGILE": "fragile handling",
    "EXPRESS": "express priority handling",
    "OVERSIZED": "oversized handling",
    "MANUAL_REVIEW": "manual review",
}

COORDINATOR_NAMES = {
    "rule": "RuleBasedCoordinator",
    "rule_based": "RuleBasedCoordinator",
    "weighted": "WeightedVotingCoordinator",
    "weighted_voting": "WeightedVotingCoordinator",
    "mediator": "MediatorCoordinator",
}


def _agent_name(output: Dict[str, object]) -> str:
    return str(output.get("agent", "")).strip().lower().replace(" agent", "")


def _confidence(output: Dict[str, object]) -> float:
    try:
        return float(output.get("confidence", 0.0))
    except (TypeError, ValueError):
        return 0.0


def is_depot_lane(lane: str) -> bool:
    return lane.startswith("DEPOT_")


def _dedupe_preserve_order(values: Iterable[str]) -> List[str]:
    return list(dict.fromkeys(values))


def _normalise_triggered_lanes(agent_outputs: Sequence[Dict[str, object]]) -> List[Dict[str, object]]:
    triggered: List[Dict[str, object]] = []

    for output in agent_outputs:
        name = _agent_name(output)
        suggested_lanes = output.get("suggestedLanes")
        suggested_lane = output.get("suggestedLane")

        if name == "cargo":
            continue

        if name == "geography":
            if suggested_lane:
                triggered.append({
                    "lane": str(suggested_lane),
                    "source": "geography",
                    "confidence": _confidence(output),
                    "reason": str(output.get("explanation", "")),
                })
            continue

        lane_values: List[str] = []
        if isinstance(suggested_lanes, list):
            lane_values.extend(str(lane) for lane in suggested_lanes if lane)
        elif suggested_lane:
            lane_values.append(str(suggested_lane))

        for lane in _dedupe_preserve_order(lane_values):
            triggered.append({
                "lane": lane,
                "source": name,
                "confidence": _confidence(output),
                "reason": str(output.get("explanation", "")),
            })

    return triggered


def detect_conflicts_from_lanes(lanes: Sequence[str]) -> List[str]:
    unique_lanes = _dedupe_preserve_order(lanes)
    handling_lanes = [lane for lane in LOGISTICS_PRIORITY if lane in unique_lanes]
    depot_lanes = [lane for lane in unique_lanes if is_depot_lane(lane)]

    if len(handling_lanes) > 1:
        return [" vs ".join(handling_lanes)]

    if len(handling_lanes) == 1 and depot_lanes:
        return [f"{handling_lanes[0]} vs {depot_lanes[0]}"]

    return []


def final_handling_lane(final_lane: str) -> str:
    return final_lane if final_lane in HANDLING_ROUTE_PREFIX else "NORMAL"


def get_coordinator(name: str) -> "BaseLogisticsCoordinator":
    normalised = name.strip().lower().replace("-", "_")
    if normalised in {"rule", "rule_based", "rulebasedcoordinator"}:
        return RuleBasedCoordinator()
    if normalised in {"weighted", "weighted_voting", "weightedvotingcoordinator"}:
        return WeightedVotingCoordinator()
    if normalised in {"mediator", "mediatorcoordinator"}:
        return MediatorCoordinator()
    raise ValueError(f"Unknown coordinator: {name}")


class BaseLogisticsCoordinator:
    name = "BaseLogisticsCoordinator"

    def coordinate(self, agent_outputs: List[Dict[str, object]]) -> Dict[str, object]:
        geography = self._by_agent(agent_outputs, "geography")
        triggered = _normalise_triggered_lanes(agent_outputs)
        final_lane, scores = self._select_final_lane(triggered, geography, agent_outputs)
        triggered_lanes = [str(item["lane"]) for item in triggered]
        conflicts = detect_conflicts_from_lanes(triggered_lanes)
        route = list(geography.get("route", ["Manual Routing"])) if geography else ["Manual Routing"]
        hub = str(geography.get("hub", "Manual Routing")) if geography else "Manual Routing"
        depot = str(geography.get("depot", "Unknown Depot")) if geography else "Unknown Depot"
        full_route = self._full_route(final_lane, route)

        return {
            "strategy": self.name,
            "triggeredRules": self._triggered_rule_text(triggered),
            "triggeredLanes": triggered_lanes,
            "detectedConflicts": conflicts,
            "finalLane": final_lane,
            "hub": hub,
            "depot": depot,
            "route": route,
            "fullRoute": full_route,
            "finalHandlingLane": final_handling_lane(final_lane),
            "scores": scores,
            "explanation": self._explain(final_lane, conflicts, hub, depot),
        }

    def _select_final_lane(
        self,
        triggered: Sequence[Dict[str, object]],
        geography: Optional[Dict[str, object]],
        agent_outputs: Sequence[Dict[str, object]],
    ) -> tuple[str, Dict[str, float]]:
        raise NotImplementedError

    def _full_route(self, final_lane: str, route: List[str]) -> List[str]:
        route_prefix = HANDLING_ROUTE_PREFIX.get(final_lane)
        if route_prefix:
            return [route_prefix, *route]
        return route

    def _choose_safety_then_route(
        self,
        triggered: Sequence[Dict[str, object]],
        geography: Optional[Dict[str, object]],
    ) -> str:
        lanes = {str(item["lane"]) for item in triggered}
        for lane in LOGISTICS_PRIORITY:
            if lane in lanes:
                return lane
        if geography and geography.get("suggestedLane"):
            return str(geography["suggestedLane"])
        return "MANUAL_REVIEW"

    def _triggered_rule_text(self, triggered: Sequence[Dict[str, object]]) -> List[str]:
        if not triggered:
            return ["No known geography or handling route was triggered; manual review is required."]
        return [
            f"{item['source']} triggered {item['lane']} ({float(item['confidence']) * 100:.0f}% confidence)."
            for item in triggered
        ]

    def _explain(self, final_lane: str, conflicts: Sequence[str], hub: str, depot: str) -> str:
        if final_lane == "MANUAL_REVIEW":
            return "The coordinator could not make a sufficiently reliable automated routing decision."
        if final_lane in HANDLING_ROUTE_PREFIX:
            return (
                f"{final_lane} was selected before the normal route because special handling has "
                f"priority. The onward route remains {hub} -> {depot}."
            )
        if conflicts:
            return f"{final_lane} was selected after resolving route and handling conflicts."
        return f"No higher-priority handling rule applied, so the normal depot route is used: {depot}."

    def _by_agent(
        self,
        agent_outputs: List[Dict[str, object]],
        agent_name: str,
    ) -> Optional[Dict[str, object]]:
        return next(
            (
                output
                for output in agent_outputs
                if _agent_name(output) == agent_name
            ),
            None,
        )


class RuleBasedCoordinator(BaseLogisticsCoordinator):
    name = "RuleBasedCoordinator"

    def _select_final_lane(
        self,
        triggered: Sequence[Dict[str, object]],
        geography: Optional[Dict[str, object]],
        agent_outputs: Sequence[Dict[str, object]],
    ) -> tuple[str, Dict[str, float]]:
        return self._choose_safety_then_route(triggered, geography), {}


class WeightedVotingCoordinator(BaseLogisticsCoordinator):
    name = "WeightedVotingCoordinator"

    source_weights = {
        "handling": 1.5,
        "size": 1.2,
        "geography": 1.0,
    }

    def _select_final_lane(
        self,
        triggered: Sequence[Dict[str, object]],
        geography: Optional[Dict[str, object]],
        agent_outputs: Sequence[Dict[str, object]],
    ) -> tuple[str, Dict[str, float]]:
        scores: Dict[str, float] = {}

        for item in triggered:
            lane = str(item["lane"])
            weight = self.source_weights.get(str(item["source"]), 1.0)
            scores[lane] = scores.get(lane, 0.0) + float(item["confidence"]) * weight

        if not scores:
            return "MANUAL_REVIEW", {"MANUAL_REVIEW": 0.5}

        def sort_key(lane: str) -> tuple[float, int]:
            priority_index = LOGISTICS_PRIORITY.index(lane) if lane in LOGISTICS_PRIORITY else 99
            return (-scores[lane], priority_index)

        return sorted(scores, key=sort_key)[0], scores


class MediatorCoordinator(BaseLogisticsCoordinator):
    name = "MediatorCoordinator"

    def _select_final_lane(
        self,
        triggered: Sequence[Dict[str, object]],
        geography: Optional[Dict[str, object]],
        agent_outputs: Sequence[Dict[str, object]],
    ) -> tuple[str, Dict[str, float]]:
        low_confidence = [output for output in agent_outputs if _confidence(output) < 0.6]
        has_special_handling = any(str(item["lane"]) in LOGISTICS_PRIORITY for item in triggered)

        if len(low_confidence) >= 2:
            return "MANUAL_REVIEW", {}

        if geography and geography.get("suggestedLane") is None and not has_special_handling:
            return "MANUAL_REVIEW", {}

        return self._choose_safety_then_route(triggered, geography), {}


class LogisticsCoordinator:
    """Compatibility wrapper used by earlier tests and scripts."""

    def __init__(self, strategy: str = "rule"):
        self.strategy = strategy
        self.delegate = get_coordinator(strategy)

    def coordinate(self, agent_outputs: List[Dict[str, object]]) -> Dict[str, object]:
        decision = self.delegate.coordinate(agent_outputs)
        decision["strategy"] = COORDINATOR_NAMES.get(
            self.strategy.strip().lower().replace("-", "_"),
            self.delegate.name,
        )
        return decision
