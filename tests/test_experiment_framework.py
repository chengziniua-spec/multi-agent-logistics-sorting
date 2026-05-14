import csv
import random

from src.agents import run_specialist_agents
from src.coordinators import (
    MediatorCoordinator,
    RuleBasedCoordinator,
    WeightedVotingCoordinator,
    detect_conflicts_from_lanes,
)
from src.experiment_runner import run_experiment
from src.noise import inject_noise
from src.package_generator import generate_logistics_package
from src.uk_geography import classify_geography


def test_conflict_detection_includes_handling_and_depot_route() -> None:
    conflicts = detect_conflicts_from_lanes(["COLD_CHAIN", "EXPRESS", "DEPOT_NOTTINGHAM"])

    assert conflicts == ["COLD_CHAIN vs EXPRESS"]

    assert detect_conflicts_from_lanes(["FRAGILE", "DEPOT_MANCHESTER"]) == [
        "FRAGILE vs DEPOT_MANCHESTER"
    ]


def test_noise_injection_applies_controlled_operations_at_full_probability() -> None:
    package = generate_logistics_package(1, "normal", random.Random(7))
    noisy, operations = inject_noise(package, 1.0, random.Random(12))

    assert noisy["postcode"] == ""
    assert noisy["cargoDescription"] in {"mixed items", "assorted goods", "general parcel", "unknown contents"}
    assert noisy["weight"] != package["weight"]
    assert noisy["fragile"] != package["fragile"]
    assert noisy["coldChain"] != package["coldChain"]
    assert noisy["priority"] != package["priority"]
    assert set(operations) >= {
        "corrupt_postcode",
        "remove_postcode",
        "ambiguous_cargo",
        "perturb_weight",
        "flip_fragile",
        "flip_coldChain",
        "flip_priority",
    }


def test_coordinators_make_expected_safety_and_route_decisions() -> None:
    package = {
        "addressLine": "University Park, Nottingham",
        "city": "Nottingham",
        "postcode": "NG7 2RD",
        "cargoDescription": "frozen pizza",
        "length": 40,
        "width": 30,
        "height": 20,
        "weight": 5,
        "fragile": False,
        "coldChain": True,
        "priority": True,
    }
    outputs = run_specialist_agents(package)

    for coordinator in (RuleBasedCoordinator(), WeightedVotingCoordinator(), MediatorCoordinator()):
        decision = coordinator.coordinate(outputs)
        assert decision["finalLane"] == "COLD_CHAIN"
        assert decision["finalHandlingLane"] == "COLD_CHAIN"
        assert decision["depot"] == "Nottingham Delivery Depot"

    normal_outputs = run_specialist_agents({
        **package,
        "postcode": "E14 5AB",
        "addressLine": "Canary Wharf, East London",
        "city": "London",
        "cargoDescription": "legal documents",
        "coldChain": False,
        "priority": False,
    })
    assert RuleBasedCoordinator().coordinate(normal_outputs)["finalLane"] == "DEPOT_EAST_LONDON"


def test_hub_depot_routing_for_east_london() -> None:
    result = classify_geography("E14 5AB", city="London", address="Canary Wharf, East London")

    assert result["hub"] == "London Sorting Centre"
    assert result["depot"] == "East London Delivery Depot"
    assert result["suggestedLane"] == "DEPOT_EAST_LONDON"


def test_experiment_runner_creates_csv_output(tmp_path) -> None:
    run_experiment(
        package_count=6,
        independent_runs=1,
        dataset_modes=("normal",),
        noise_levels=(0.0,),
        coordinators=("rule_based",),
        output_dir=str(tmp_path),
        figures_dir=str(tmp_path / "figures"),
        base_seed=123,
    )

    results_path = tmp_path / "experiment_results.csv"
    condition_path = tmp_path / "summary_by_condition.csv"
    coordinator_path = tmp_path / "summary_by_coordinator.csv"
    traces_path = tmp_path / "sample_decision_traces.csv"
    report_path = tmp_path / "report_results.md"
    figure_path = tmp_path / "figures" / "accuracy_by_noise.png"

    assert results_path.exists()
    assert condition_path.exists()
    assert coordinator_path.exists()
    assert traces_path.exists()
    assert report_path.exists()
    assert figure_path.exists()

    with results_path.open(newline="", encoding="utf-8") as csvfile:
        rows = list(csv.DictReader(csvfile))

    assert len(rows) == 1
    assert rows[0]["coordinator"] == "RuleBasedCoordinator"
    assert int(rows[0]["num_packages"]) == 6
    assert "final_accuracy" in rows[0]
