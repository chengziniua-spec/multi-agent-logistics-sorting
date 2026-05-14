import csv
import random
from typing import Any, Dict, Iterable, List, Optional

from src.agents import run_specialist_agents
from src.coordinators import RuleBasedCoordinator
from src.uk_geography import ROUTE_MAP

PACKAGE_DESTINATIONS = ["Warehouse A", "Warehouse B", "Distribution Center", "Retail Hub"]
DATASET_MODES = ("normal", "multi_label", "conflict_heavy", "noisy_address")

CARGO_PROFILES = {
    "Food": ["fresh apples", "frozen pizza", "milk and bread", "fruit snacks"],
    "Electronics": ["laptop", "phone charger", "camera battery", "headphones"],
    "Clothing": ["winter jacket", "running shoes", "cotton shirt", "hoodie"],
    "Documents": ["legal documents", "invoice papers", "signed contract", "paper transcript"],
    "Medicine": ["insulin package", "vaccine box", "medical prescription", "medicine parcel"],
    "General Goods": ["mixed household items", "assorted retail goods", "general parcel"],
}

FALLBACK_AREAS = ["E", "EC", "NG", "M", "CF", "EH"]


def generate_packages(count: int) -> List[Dict[str, str]]:
    packages = []
    for i in range(1, count + 1):
        packages.append({
            "id": str(i),
            "weight": f"{random.uniform(0.5, 15.0):.2f}",
            "priority": str(random.choice([1, 2, 3])),
            "destination": random.choice(PACKAGE_DESTINATIONS),
        })
    return packages


def save_packages(path: str, packages: List[Dict[str, str]]) -> None:
    with open(path, mode="w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["id", "weight", "priority", "destination"])
        writer.writeheader()
        writer.writerows(packages)


def make_postcode(area: str, rng: random.Random) -> str:
    outward_code = f"{area}{rng.randint(1, 20)}"
    inward_code = f"{rng.randint(1, 9)}{rng.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{rng.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}"
    return f"{outward_code} {inward_code}"


def _normal_dimensions(rng: random.Random) -> Dict[str, float]:
    return {
        "length": rng.randint(18, 60),
        "width": rng.randint(12, 45),
        "height": rng.randint(4, 35),
        "weight": round(rng.uniform(0.4, 12.0), 2),
    }


def _oversized_dimensions(rng: random.Random) -> Dict[str, float]:
    if rng.random() < 0.5:
        return {
            "length": rng.randint(90, 150),
            "width": rng.randint(50, 90),
            "height": rng.randint(45, 80),
            "weight": round(rng.uniform(8.0, 18.0), 2),
        }
    return {
        "length": rng.randint(45, 75),
        "width": rng.randint(35, 65),
        "height": rng.randint(25, 55),
        "weight": round(rng.uniform(21.0, 36.0), 2),
    }


def _choose_area(rng: random.Random, preferred: Optional[Iterable[str]] = None) -> str:
    areas = list(preferred) if preferred else list(ROUTE_MAP.keys())
    return rng.choice(areas)


def _base_package(package_id: int, rng: random.Random, area: Optional[str] = None) -> Dict[str, Any]:
    postcode_area = area or _choose_area(rng)
    route = ROUTE_MAP[postcode_area]
    cargo_label = rng.choice(list(CARGO_PROFILES.keys()))
    cargo_description = rng.choice(CARGO_PROFILES[cargo_label])
    package: Dict[str, Any] = {
        "id": f"PKG-{package_id:05d}",
        "addressLine": f"{route['area_hint']} delivery address",
        "recipientAddress": f"{route['area_hint']} delivery address",
        "city": route["area_hint"],
        "postcode": make_postcode(postcode_area, rng),
        "cargoDescription": cargo_description,
        "cargoLabel": cargo_label,
        "fragile": False,
        "coldChain": False,
        "priority": False,
        "datasetMode": "normal",
    }
    package.update(_normal_dimensions(rng))
    return package


def _apply_normal_mode(package: Dict[str, Any], rng: random.Random) -> None:
    package["priority"] = rng.random() < 0.12
    package["fragile"] = rng.random() < 0.06
    package["coldChain"] = package["cargoLabel"] == "Medicine" and rng.random() < 0.18


def _apply_multi_label_mode(package: Dict[str, Any], rng: random.Random) -> None:
    scenario = rng.choice(["nottingham_food", "fragile_electronics", "priority_documents", "medicine_route"])
    if scenario == "nottingham_food":
        package.update({
            "addressLine": "University Park, Nottingham",
            "recipientAddress": "University Park, Nottingham",
            "city": "Nottingham",
            "postcode": make_postcode("NG", rng),
            "cargoDescription": rng.choice(CARGO_PROFILES["Food"]),
            "cargoLabel": "Food",
        })
    elif scenario == "fragile_electronics":
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Electronics"])
        package["cargoLabel"] = "Electronics"
        package["fragile"] = True
    elif scenario == "priority_documents":
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Documents"])
        package["cargoLabel"] = "Documents"
        package["priority"] = True
    else:
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Medicine"])
        package["cargoLabel"] = "Medicine"
        package["coldChain"] = True


def _apply_conflict_heavy_mode(package: Dict[str, Any], rng: random.Random) -> None:
    scenario = rng.choice(["cold_priority", "fragile_oversized", "cold_fragile", "priority_oversized"])
    if scenario == "cold_priority":
        package["coldChain"] = True
        package["priority"] = True
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Medicine"])
        package["cargoLabel"] = "Medicine"
    elif scenario == "fragile_oversized":
        package["fragile"] = True
        package.update(_oversized_dimensions(rng))
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Electronics"])
        package["cargoLabel"] = "Electronics"
    elif scenario == "cold_fragile":
        package["coldChain"] = True
        package["fragile"] = True
        package["cargoDescription"] = rng.choice(CARGO_PROFILES["Medicine"])
        package["cargoLabel"] = "Medicine"
    else:
        package["priority"] = True
        package.update(_oversized_dimensions(rng))


def _apply_noisy_address_mode(package: Dict[str, Any], rng: random.Random) -> None:
    area = _choose_area(rng, FALLBACK_AREAS)
    route = ROUTE_MAP[area]
    package.update({
        "addressLine": f"{route['area_hint']} depot route",
        "recipientAddress": f"{route['area_hint']} depot route",
        "city": route["area_hint"],
        "postcode": make_postcode(area, rng),
    })
    if rng.random() < 0.35:
        package["addressLine"] = "Ambiguous industrial estate"
        package["recipientAddress"] = "Ambiguous industrial estate"
        package["city"] = route["area_hint"]
    _apply_normal_mode(package, rng)


def annotate_ground_truth(package: Dict[str, Any]) -> Dict[str, Any]:
    annotated = dict(package)
    decision = RuleBasedCoordinator().coordinate(run_specialist_agents(annotated))
    annotated.update({
        "expectedFinalLane": decision["finalLane"],
        "expectedHandlingLane": decision["finalHandlingLane"],
        "expectedHub": decision["hub"],
        "expectedDepot": decision["depot"],
        "expectedRoute": " -> ".join(decision["route"]),
        "expectedConflictCase": bool(decision["detectedConflicts"]),
        "expectedConflictResolution": decision["finalLane"],
    })
    return annotated


def generate_logistics_package(package_id: int, mode: str, rng: random.Random) -> Dict[str, Any]:
    if mode not in DATASET_MODES:
        raise ValueError(f"Unknown dataset mode: {mode}")

    area = _choose_area(rng, FALLBACK_AREAS if mode == "noisy_address" else None)
    package = _base_package(package_id, rng, area)
    package["datasetMode"] = mode

    if mode == "normal":
        _apply_normal_mode(package, rng)
    elif mode == "multi_label":
        _apply_multi_label_mode(package, rng)
    elif mode == "conflict_heavy":
        _apply_conflict_heavy_mode(package, rng)
    elif mode == "noisy_address":
        _apply_noisy_address_mode(package, rng)

    return annotate_ground_truth(package)


def generate_logistics_dataset(count: int, mode: str, seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    return [generate_logistics_package(index + 1, mode, rng) for index in range(count)]
