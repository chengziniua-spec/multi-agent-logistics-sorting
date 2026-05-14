from abc import ABC, abstractmethod
from typing import Any, Dict, List, Sequence

from src.uk_geography import GeographyClassification, classify_geography


class Agent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def choose_package(self, packages: List[Dict[str, str]]) -> Dict[str, str]:
        pass


class RandomAgent(Agent):
    def choose_package(self, packages: List[Dict[str, str]]) -> Dict[str, str]:
        import random

        if not packages:
            return {}
        return random.choice(packages)


class PriorityAgent(Agent):
    def choose_package(self, packages: List[Dict[str, str]]) -> Dict[str, str]:
        if not packages:
            return {}
        sorted_packages = sorted(packages, key=lambda p: int(p["priority"]))
        return sorted_packages[0]


class GeographyAgent:
    def __init__(self, name: str = "GeographyAgent"):
        self.name = name

    def classify(self, package: Dict[str, str]) -> GeographyClassification:
        return classify_geography(
            postcode=package.get("postcode", ""),
            city=package.get("city", ""),
            address=package.get("recipientAddress", package.get("addressLine", "")),
        )


def _as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def _match_keywords(description: str, keywords: Sequence[str]) -> List[str]:
    return [keyword for keyword in keywords if keyword in description]


class CargoTypeAgent:
    categories = [
        ("Medicine", ["insulin", "medical", "medicine", "prescription", "vaccine"]),
        (
            "Food",
            [
                "apple",
                "pizza",
                "milk",
                "snack",
                "food",
                "fresh",
                "frozen",
                "chocolate",
                "bread",
                "fruit",
            ],
        ),
        ("Electronics", ["laptop", "charger", "phone", "headphones", "camera", "battery"]),
        ("Clothing", ["shirt", "jacket", "shoes", "hoodie", "trousers"]),
        ("Documents", ["document", "transcript", "invoice", "paper", "contract"]),
    ]

    def classify(self, package: Dict[str, Any]) -> Dict[str, Any]:
        raw_description = str(package.get("cargoDescription", ""))
        description = raw_description.strip().lower()
        ranked_matches = []

        for priority, (label, keywords) in enumerate(self.categories):
            matches = _match_keywords(description, keywords)
            if matches:
                ranked_matches.append((label, matches, priority))

        if ranked_matches:
            label, matches, _ = sorted(
                ranked_matches,
                key=lambda item: (-len(item[1]), item[2]),
            )[0]
            confidence = min(0.94, 0.75 + len(matches) * 0.07)
            return {
                "agent": "cargo",
                "inputUsed": f'"{raw_description or "not supplied"}"',
                "label": label,
                "confidence": confidence,
                "suggestedLane": None,
                "explanation": (
                    f"The description contains {label.lower()}-related keywords: "
                    f"{', '.join(matches)}."
                ),
            }

        return {
            "agent": "cargo",
            "inputUsed": f'"{raw_description or "not supplied"}"',
            "label": "General Goods",
            "confidence": 0.52 if description else 0.35,
            "suggestedLane": None,
            "explanation": (
                "No specialist cargo keywords were found, so the package is treated as general goods."
                if description
                else "No cargo description was supplied."
            ),
        }


class SizeAgent:
    def classify(self, package: Dict[str, Any]) -> Dict[str, Any]:
        length = _as_float(package.get("length"))
        width = _as_float(package.get("width"))
        height = _as_float(package.get("height"))
        weight = _as_float(package.get("weight"))
        volume = length * width * height
        is_oversized = volume > 200000 or weight > 20

        if is_oversized:
            return {
                "agent": "size",
                "inputUsed": f"{length:g} x {width:g} x {height:g} cm, {weight:g} kg",
                "label": "Oversized",
                "confidence": 0.9,
                "suggestedLane": "OVERSIZED",
                "explanation": (
                    "The package exceeds the configured size or weight threshold and should be routed "
                    "to oversized handling."
                ),
            }

        return {
            "agent": "size",
            "inputUsed": f"{length:g} x {width:g} x {height:g} cm, {weight:g} kg",
            "label": "Standard",
            "confidence": 0.85,
            "suggestedLane": None,
            "explanation": "The package is within the standard volume and weight thresholds.",
        }


class HandlingAgent:
    def classify(self, package: Dict[str, Any]) -> Dict[str, Any]:
        cold_chain = _as_bool(package.get("coldChain"))
        fragile = _as_bool(package.get("fragile"))
        priority = _as_bool(package.get("priority"))
        suggested_lanes = [
            *("COLD_CHAIN" for _ in [0] if cold_chain),
            *("FRAGILE" for _ in [0] if fragile),
            *("EXPRESS" for _ in [0] if priority),
        ]

        if cold_chain:
            label_parts = ["Cold-chain"]
            if fragile:
                label_parts.append("Fragile")
            if priority:
                label_parts.append("Priority")
            return {
                "agent": "handling",
                "inputUsed": "cold-chain flag",
                "label": " + ".join(label_parts),
                "confidence": 0.95,
                "suggestedLane": "COLD_CHAIN",
                "suggestedLanes": suggested_lanes,
                "explanation": (
                    "Cold-chain goods require temperature-controlled routing before other handling "
                    "preferences."
                ),
            }

        if fragile:
            return {
                "agent": "handling",
                "inputUsed": "fragile flag",
                "label": "Fragile + Priority" if priority else "Fragile",
                "confidence": 0.9,
                "suggestedLane": "FRAGILE",
                "suggestedLanes": suggested_lanes,
                "explanation": "Fragile goods should be routed to careful handling to reduce damage risk.",
            }

        if priority:
            return {
                "agent": "handling",
                "inputUsed": "priority flag",
                "label": "Priority",
                "confidence": 0.85,
                "suggestedLane": "EXPRESS",
                "suggestedLanes": suggested_lanes,
                "explanation": (
                    "Priority goods are routed to the express lane when no stronger safety constraint "
                    "is active."
                ),
            }

        return {
            "agent": "handling",
            "inputUsed": "handling flags",
            "label": "Normal",
            "confidence": 0.8,
            "suggestedLane": None,
            "suggestedLanes": [],
            "explanation": "No special handling flag is active, so normal handling is suitable.",
        }


def run_specialist_agents(package: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        GeographyAgent().classify(package),
        CargoTypeAgent().classify(package),
        SizeAgent().classify(package),
        HandlingAgent().classify(package),
    ]
