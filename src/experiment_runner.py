import csv
import json
import random
import statistics
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

from src.agents import run_specialist_agents
from src.coordinators import get_coordinator
from src.metrics import compute_experiment_metrics
from src.noise import inject_noise
from src.package_generator import DATASET_MODES, generate_logistics_dataset

DEFAULT_COORDINATORS = ("rule_based", "weighted_voting", "mediator")
DEFAULT_NOISE_LEVELS = (0.0, 0.1, 0.2, 0.35)
METRICS = (
    "final_accuracy",
    "handling_accuracy",
    "hub_accuracy",
    "depot_accuracy",
    "conflict_rate",
    "conflict_resolution_accuracy",
    "manual_review_rate",
    "avg_processing_time_ms",
)

RESULT_FIELDS = [
    "coordinator",
    "dataset_mode",
    "noise_level",
    "run_id",
    "num_packages",
    *METRICS,
]

TRACE_FIELDS = [
    "package_id",
    "coordinator",
    "dataset_mode",
    "noise_level",
    "run_id",
    "address_line",
    "city",
    "postcode",
    "cargo_description",
    "length",
    "width",
    "height",
    "weight",
    "fragile",
    "cold_chain",
    "priority",
    "noise_operations",
    "predicted_final_lane",
    "expected_final_lane",
    "predicted_handling",
    "expected_handling",
    "predicted_hub",
    "expected_hub",
    "predicted_depot",
    "expected_depot",
    "conflict_detected",
    "detected_conflicts",
    "triggered_decisions",
    "final_correct",
]


def _seed_for(base_seed: int, mode_index: int, noise_index: int, run_id: int) -> int:
    return base_seed + mode_index * 100_000 + noise_index * 10_000 + run_id


def _write_csv(path: Path, rows: Sequence[Dict[str, Any]], fields: Sequence[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=list(fields), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _std(values: Sequence[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def _mean(values: Sequence[float]) -> float:
    return statistics.fmean(values) if values else 0.0


def _group_rows(rows: Iterable[Dict[str, Any]], keys: Sequence[str]) -> Dict[tuple[Any, ...], List[Dict[str, Any]]]:
    grouped: Dict[tuple[Any, ...], List[Dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(tuple(row[key] for key in keys), []).append(row)
    return grouped


def _aggregate_rows(
    rows: Sequence[Dict[str, Any]],
    keys: Sequence[str],
) -> List[Dict[str, Any]]:
    aggregate_rows: List[Dict[str, Any]] = []
    grouped = _group_rows(rows, keys)

    for key_values, group in sorted(grouped.items(), key=lambda item: item[0]):
        output = {key: value for key, value in zip(keys, key_values)}
        output["num_runs"] = len(group)
        output["num_packages"] = sum(int(row["num_packages"]) for row in group)
        for metric in METRICS:
            values = [float(row[metric]) for row in group]
            output[f"{metric}_mean"] = _mean(values)
            output[f"{metric}_std"] = _std(values)
        aggregate_rows.append(output)

    return aggregate_rows


def _summary_fields(keys: Sequence[str]) -> List[str]:
    fields = [*keys, "num_runs", "num_packages"]
    for metric in METRICS:
        fields.extend([f"{metric}_mean", f"{metric}_std"])
    return fields


def _condition_metrics_from_traces(traces: List[Dict[str, Any]]) -> Dict[str, float]:
    legacy_metrics = compute_experiment_metrics(traces)
    return {
        "final_accuracy": legacy_metrics["final_decision_accuracy"],
        "handling_accuracy": legacy_metrics["handling_accuracy"],
        "hub_accuracy": legacy_metrics["hub_accuracy"],
        "depot_accuracy": legacy_metrics["depot_accuracy"],
        "conflict_rate": legacy_metrics["conflict_rate"],
        "conflict_resolution_accuracy": legacy_metrics["conflict_resolution_accuracy"],
        "manual_review_rate": legacy_metrics["manual_review_rate"],
        "avg_processing_time_ms": legacy_metrics["avg_processing_time_ms"],
    }


def _trace_from_decision(
    coordinator_name: str,
    package: Dict[str, Any],
    decision: Dict[str, Any],
    dataset_mode: str,
    noise_level: float,
    run_id: int,
    processing_time_ms: float,
) -> Dict[str, Any]:
    final_lane = str(decision["finalLane"])
    final_handling = str(decision["finalHandlingLane"])
    hub = str(decision["hub"])
    depot = str(decision["depot"])
    expected_final = str(package["expectedFinalLane"])
    expected_handling = str(package["expectedHandlingLane"])
    expected_hub = str(package["expectedHub"])
    expected_depot = str(package["expectedDepot"])
    conflicts = list(decision.get("detectedConflicts", []))

    return {
        "package_id": package["id"],
        "coordinator": coordinator_name,
        "dataset_mode": dataset_mode,
        "noise_level": noise_level,
        "run_id": run_id,
        "address_line": package.get("addressLine", ""),
        "city": package.get("city", ""),
        "postcode": package.get("postcode", ""),
        "cargo_description": package.get("cargoDescription", ""),
        "length": package.get("length", ""),
        "width": package.get("width", ""),
        "height": package.get("height", ""),
        "weight": package.get("weight", ""),
        "fragile": package.get("fragile", ""),
        "cold_chain": package.get("coldChain", ""),
        "priority": package.get("priority", ""),
        "noise_operations": package.get("noiseOperations", ""),
        "predicted_final_lane": final_lane,
        "expected_final_lane": expected_final,
        "predicted_handling": final_handling,
        "expected_handling": expected_handling,
        "predicted_hub": hub,
        "expected_hub": expected_hub,
        "predicted_depot": depot,
        "expected_depot": expected_depot,
        "conflict_detected": bool(conflicts),
        "is_conflict_case": bool(conflicts),
        "detected_conflicts": " | ".join(conflicts),
        "triggered_decisions": " | ".join(str(lane) for lane in decision.get("triggeredLanes", [])),
        "final_correct": final_lane == expected_final,
        "final_decision_correct": final_lane == expected_final,
        "handling_correct": final_handling == expected_handling,
        "hub_correct": hub == expected_hub,
        "depot_correct": depot == expected_depot,
        "final_lane": final_lane,
        "processing_time_ms": processing_time_ms,
    }


def _write_placeholder_png(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(
        bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000A49444154789C636000000200015D0B2A0B0000000049454E44AE426082"
        )
    )


def _metric_by_noise(rows: Sequence[Dict[str, Any]], metric: str) -> Dict[str, Dict[float, tuple[float, float]]]:
    grouped = _group_rows(rows, ("coordinator", "noise_level"))
    series: Dict[str, Dict[float, tuple[float, float]]] = {}
    for (coordinator, noise_level), group in grouped.items():
        values = [float(row[metric]) for row in group]
        series.setdefault(str(coordinator), {})[float(noise_level)] = (_mean(values), _std(values))
    return series


def _metric_by_coordinator_for_dataset(
    rows: Sequence[Dict[str, Any]],
    metric: str,
    dataset_mode: str,
) -> Dict[str, tuple[float, float]]:
    grouped = _group_rows(
        [row for row in rows if row["dataset_mode"] == dataset_mode],
        ("coordinator",),
    )
    return {
        str(key[0]): (_mean([float(row[metric]) for row in group]), _std([float(row[metric]) for row in group]))
        for key, group in grouped.items()
    }


def _metric_by_dataset(rows: Sequence[Dict[str, Any]], metric: str) -> Dict[str, tuple[float, float]]:
    grouped = _group_rows(rows, ("dataset_mode",))
    return {
        str(key[0]): (_mean([float(row[metric]) for row in group]), _std([float(row[metric]) for row in group]))
        for key, group in grouped.items()
    }


def generate_figures(rows: Sequence[Dict[str, Any]], figures_dir: Path) -> None:
    figures_dir.mkdir(parents=True, exist_ok=True)
    figure_names = [
        "accuracy_by_noise.png",
        "handling_accuracy_by_noise.png",
        "depot_accuracy_by_noise.png",
        "conflict_resolution_accuracy.png",
        "manual_review_rate.png",
        "conflict_rate_by_dataset.png",
    ]

    try:
        import matplotlib.pyplot as plt
    except ImportError:
        for figure_name in figure_names:
            _write_placeholder_png(figures_dir / figure_name)
        return

    line_specs = [
        ("final_accuracy", "accuracy_by_noise.png", "Final Accuracy by Noise", "Mean final_accuracy", True),
        (
            "handling_accuracy",
            "handling_accuracy_by_noise.png",
            "Handling Accuracy by Noise",
            "Mean handling_accuracy",
            False,
        ),
        ("depot_accuracy", "depot_accuracy_by_noise.png", "Depot Accuracy by Noise", "Mean depot_accuracy", False),
        ("manual_review_rate", "manual_review_rate.png", "Manual Review Rate by Noise", "Mean manual_review_rate", False),
    ]

    for metric, filename, title, ylabel, include_error_bars in line_specs:
        series = _metric_by_noise(rows, metric)
        plt.figure(figsize=(7.2, 4.6))
        for coordinator, values_by_noise in sorted(series.items()):
            noise_levels = sorted(values_by_noise)
            means = [values_by_noise[noise][0] for noise in noise_levels]
            stds = [values_by_noise[noise][1] for noise in noise_levels]
            if include_error_bars:
                plt.errorbar(noise_levels, means, yerr=stds, marker="o", capsize=4, label=coordinator)
            else:
                plt.plot(noise_levels, means, marker="o", label=coordinator)
        plt.title(title)
        plt.xlabel("Noise level")
        plt.ylabel(ylabel)
        plt.ylim(0, 1.05)
        plt.grid(True, alpha=0.25)
        plt.legend()
        plt.tight_layout()
        plt.savefig(figures_dir / filename, dpi=180)
        plt.close()

    conflict_values = _metric_by_coordinator_for_dataset(rows, "conflict_resolution_accuracy", "conflict_heavy")
    labels = sorted(conflict_values)
    means = [conflict_values[label][0] for label in labels]
    stds = [conflict_values[label][1] for label in labels]
    plt.figure(figsize=(7.2, 4.6))
    plt.bar(labels, means, yerr=stds, capsize=5, color=["#0f766e", "#2563eb", "#b45309"])
    plt.title("Conflict Resolution Accuracy on Conflict-Heavy Dataset")
    plt.ylabel("Mean conflict_resolution_accuracy")
    plt.ylim(0, 1.05)
    plt.xticks(rotation=12, ha="right")
    plt.tight_layout()
    plt.savefig(figures_dir / "conflict_resolution_accuracy.png", dpi=180)
    plt.close()

    conflict_rate_values = _metric_by_dataset(rows, "conflict_rate")
    labels = sorted(conflict_rate_values)
    means = [conflict_rate_values[label][0] for label in labels]
    stds = [conflict_rate_values[label][1] for label in labels]
    plt.figure(figsize=(7.2, 4.6))
    plt.bar(labels, means, yerr=stds, capsize=5, color="#0f766e")
    plt.title("Conflict Rate by Dataset Mode")
    plt.ylabel("Mean conflict_rate")
    plt.ylim(0, 1.05)
    plt.xticks(rotation=12, ha="right")
    plt.tight_layout()
    plt.savefig(figures_dir / "conflict_rate_by_dataset.png", dpi=180)
    plt.close()
    generate_combined_figures(figures_dir)


def generate_combined_figures(figures_dir: Path) -> None:
    combined_specs = [
        (
            "combined_accuracy_overview.png",
            "Accuracy Metrics Overview",
            [
                "accuracy_by_noise.png",
                "handling_accuracy_by_noise.png",
                "depot_accuracy_by_noise.png",
            ],
        ),
        (
            "combined_conflict_review_overview.png",
            "Conflict and Review Metrics Overview",
            [
                "conflict_resolution_accuracy.png",
                "manual_review_rate.png",
                "conflict_rate_by_dataset.png",
            ],
        ),
    ]

    try:
        import matplotlib.image as mpimg
        import matplotlib.pyplot as plt
    except ImportError:
        return

    for output_name, title, input_names in combined_specs:
        image_paths = [figures_dir / name for name in input_names]
        if not all(path.exists() for path in image_paths):
            continue

        fig, axes = plt.subplots(1, 3, figsize=(18, 5.6))
        fig.suptitle(title, fontsize=16, fontweight="bold")

        for axis, image_path in zip(axes, image_paths):
            axis.imshow(mpimg.imread(image_path))
            axis.axis("off")
            axis.set_title(image_path.stem.replace("_", " ").title(), fontsize=10)

        plt.tight_layout(rect=(0, 0, 1, 0.92))
        plt.savefig(figures_dir / output_name, dpi=180)
        plt.close(fig)


def _best_by_metric(rows: Sequence[Dict[str, Any]], metric: str, filters: Dict[str, Any] | None = None) -> tuple[str, float]:
    filtered = [
        row for row in rows
        if all(row[key] == value for key, value in (filters or {}).items())
    ]
    if not filtered:
        return "Not available", 0.0

    grouped = _group_rows(filtered, ("coordinator",))
    means = {
        str(key[0]): _mean([float(row[metric]) for row in group])
        for key, group in grouped.items()
    }
    best_score = max(means.values())
    best_names = [
        coordinator
        for coordinator, score in sorted(means.items())
        if abs(score - best_score) < 1e-12
    ]
    return " / ".join(best_names), best_score


def generate_report(rows: Sequence[Dict[str, Any]], output_dir: Path, package_count: int, independent_runs: int) -> None:
    max_noise = max(float(row["noise_level"]) for row in rows)
    total_decisions = sum(int(row["num_packages"]) for row in rows)
    unique_package_sets = len({(row["dataset_mode"], row["noise_level"], row["run_id"]) for row in rows})
    unique_packages = unique_package_sets * package_count
    best_overall, best_overall_score = _best_by_metric(rows, "final_accuracy")
    best_high_noise, best_high_noise_score = _best_by_metric(
        rows,
        "final_accuracy",
        {"noise_level": max_noise},
    )
    best_conflict, best_conflict_score = _best_by_metric(
        rows,
        "conflict_resolution_accuracy",
        {"dataset_mode": "conflict_heavy"},
    )

    manual_review = _group_rows(rows, ("coordinator",))
    manual_review_lines = [
        f"- {coordinator[0]}: {_mean([float(row['manual_review_rate']) for row in group]):.3f}"
        for coordinator, group in sorted(manual_review.items())
    ]

    lines = [
        "# Report Results: Experimental Evaluation",
        "",
        "## Experiment Setup",
        "",
        (
            "Research question: How do different coordination and conflict-resolution strategies affect "
            "the performance of a multi-agent logistics sorting system under normal, noisy, and "
            "conflict-heavy package conditions?"
        ),
        "",
        "- Coordinator strategies: RuleBasedCoordinator, WeightedVotingCoordinator, MediatorCoordinator.",
        "- Dataset modes: normal, multi_label, conflict_heavy, noisy_address.",
        "- Noise levels: 0.0, 0.1, 0.2, 0.35 for full runs; quick runs may use a reduced smoke-test set.",
        f"- Repeated runs in this execution: {independent_runs}.",
        f"- Packages per run in this execution: {package_count}.",
        "- Deterministic seeds are derived from dataset mode, noise level, and run_id.",
        "",
        "## Scale",
        "",
        f"- Unique generated package instances: {unique_packages:,}.",
        f"- Coordinator package decisions processed: {total_decisions:,}.",
        "",
        "## Headline Results",
        "",
        f"- Best coordinator overall by final_accuracy: **{best_overall}** ({best_overall_score:.3f}).",
        f"- Best coordinator under high noise ({max_noise:.2f}): **{best_high_noise}** ({best_high_noise_score:.3f}).",
        (
            "- Best coordinator on conflict-heavy dataset by conflict_resolution_accuracy: "
            f"**{best_conflict}** ({best_conflict_score:.3f})."
        ),
        "",
        "## Manual Review Rate",
        "",
        *manual_review_lines,
        "",
        "## Interpretation",
        "",
        (
            "Rule-based coordination is strong when the domain priority order is known in advance: "
            "cold-chain, fragile, express, oversized, then normal depot routing. It is highly explainable "
            "and preserves the separation between handling and hub/depot routing."
        ),
        (
            "Weighted voting is useful when agent confidence scores should influence decisions, but it can "
            "match rule-based behaviour when handling signals dominate the scoring weights."
        ),
        (
            "Mediator coordination is deliberately more cautious: it can route uncertain cases to manual "
            "review when multiple agents have low confidence or routing information is missing."
        ),
        (
            "The main trade-off is automation versus caution. Lower manual review rates increase automated "
            "throughput, while higher manual review rates may be safer when address or cargo information is noisy."
        ),
    ]

    (output_dir / "report_results.md").write_text("\n".join(lines), encoding="utf-8")


def run_experiment(
    package_count: int = 500,
    independent_runs: int = 30,
    dataset_modes: Sequence[str] = DATASET_MODES,
    noise_levels: Sequence[float] = DEFAULT_NOISE_LEVELS,
    coordinators: Sequence[str] = DEFAULT_COORDINATORS,
    output_dir: str = "results",
    figures_dir: str = "figures",
    base_seed: int = 4105,
) -> List[Dict[str, Any]]:
    output_path = Path(output_dir)
    figures_path = Path(figures_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    figures_path.mkdir(parents=True, exist_ok=True)

    coordinator_instances = [get_coordinator(name) for name in coordinators]
    result_rows: List[Dict[str, Any]] = []
    sample_trace_rows: List[Dict[str, Any]] = []

    for mode_index, dataset_mode in enumerate(dataset_modes):
        for noise_index, noise_level in enumerate(noise_levels):
            for run_id in range(independent_runs):
                seed = _seed_for(base_seed, mode_index, noise_index, run_id)
                clean_packages = generate_logistics_dataset(package_count, dataset_mode, seed)
                noise_rng = random.Random(seed + 91_337)
                noisy_packages = [
                    inject_noise(package, noise_level, noise_rng)[0]
                    for package in clean_packages
                ]

                agent_payloads = []
                for package in noisy_packages:
                    agent_start = time.perf_counter()
                    agent_outputs = run_specialist_agents(package)
                    agent_elapsed_ms = (time.perf_counter() - agent_start) * 1000.0
                    agent_payloads.append((package, agent_outputs, agent_elapsed_ms))

                for coordinator in coordinator_instances:
                    traces: List[Dict[str, Any]] = []
                    for package, agent_outputs, agent_elapsed_ms in agent_payloads:
                        coord_start = time.perf_counter()
                        decision = coordinator.coordinate(agent_outputs)
                        coord_elapsed_ms = (time.perf_counter() - coord_start) * 1000.0
                        traces.append(
                            _trace_from_decision(
                                coordinator.name,
                                package,
                                decision,
                                dataset_mode,
                                noise_level,
                                run_id,
                                agent_elapsed_ms + coord_elapsed_ms,
                            )
                        )

                    metrics = _condition_metrics_from_traces(traces)
                    result_rows.append({
                        "coordinator": coordinator.name,
                        "dataset_mode": dataset_mode,
                        "noise_level": noise_level,
                        "run_id": run_id,
                        "num_packages": package_count,
                        **metrics,
                    })

                    if run_id == 0:
                        sample_trace_rows.extend(traces)

    summary_by_condition = _aggregate_rows(
        result_rows,
        ("coordinator", "dataset_mode", "noise_level"),
    )
    summary_by_coordinator = _aggregate_rows(result_rows, ("coordinator",))

    _write_csv(output_path / "experiment_results.csv", result_rows, RESULT_FIELDS)
    _write_csv(
        output_path / "summary_by_condition.csv",
        summary_by_condition,
        _summary_fields(("coordinator", "dataset_mode", "noise_level")),
    )
    _write_csv(
        output_path / "summary_by_coordinator.csv",
        summary_by_coordinator,
        _summary_fields(("coordinator",)),
    )
    _write_csv(output_path / "sample_decision_traces.csv", sample_trace_rows, TRACE_FIELDS)
    generate_report(result_rows, output_path, package_count, independent_runs)
    generate_figures(result_rows, figures_path)

    return result_rows
