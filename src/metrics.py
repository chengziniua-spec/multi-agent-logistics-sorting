from typing import Any, Dict, List


def compute_metrics(results: List[Dict[str, float]]) -> Dict[str, float]:
    total = len(results)
    if total == 0:
        return {"packages_processed": 0, "avg_time": 0.0, "success_rate": 0.0}

    total_time = sum(result["duration"] for result in results)
    successes = sum(1 for result in results if result.get("success"))

    return {
        "packages_processed": total,
        "avg_time": total_time / total,
        "success_rate": successes / total,
    }


def _rate(numerator: int, denominator: int, default: float = 0.0) -> float:
    if denominator == 0:
        return default
    return numerator / denominator


def compute_experiment_metrics(traces: List[Dict[str, Any]]) -> Dict[str, float]:
    total = len(traces)
    if total == 0:
        return {
            "packages_processed": 0.0,
            "final_decision_accuracy": 0.0,
            "handling_accuracy": 0.0,
            "hub_accuracy": 0.0,
            "depot_accuracy": 0.0,
            "conflict_rate": 0.0,
            "conflict_resolution_accuracy": 0.0,
            "manual_review_rate": 0.0,
            "avg_processing_time_ms": 0.0,
        }

    conflict_cases = [trace for trace in traces if trace["is_conflict_case"]]
    conflict_correct = sum(1 for trace in conflict_cases if trace["final_decision_correct"])

    return {
        "packages_processed": float(total),
        "final_decision_accuracy": _rate(
            sum(1 for trace in traces if trace["final_decision_correct"]),
            total,
        ),
        "handling_accuracy": _rate(sum(1 for trace in traces if trace["handling_correct"]), total),
        "hub_accuracy": _rate(sum(1 for trace in traces if trace["hub_correct"]), total),
        "depot_accuracy": _rate(sum(1 for trace in traces if trace["depot_correct"]), total),
        "conflict_rate": _rate(len(conflict_cases), total),
        "conflict_resolution_accuracy": _rate(conflict_correct, len(conflict_cases), default=1.0),
        "manual_review_rate": _rate(
            sum(1 for trace in traces if trace["final_lane"] == "MANUAL_REVIEW"),
            total,
        ),
        "avg_processing_time_ms": sum(float(trace["processing_time_ms"]) for trace in traces) / total,
    }
