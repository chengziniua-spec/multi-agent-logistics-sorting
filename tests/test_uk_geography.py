import unittest

from src.coordinators import LogisticsCoordinator
from src.uk_geography import classify_geography, extract_postcode_area


class UKGeographyRoutingTests(unittest.TestCase):
    def test_postcode_area_hub_and_depot_mapping(self) -> None:
        cases = [
            ("E14 5AB", "E", "London Sorting Centre", "East London Delivery Depot"),
            ("EC1A 1BB", "EC", "London Sorting Centre", "Central London Delivery Depot"),
            ("SW1A 1AA", "SW", "London Sorting Centre", "South West London Delivery Depot"),
            ("NG7 2RD", "NG", "East Midlands Sorting Centre", "Nottingham Delivery Depot"),
            ("CF10 1EP", "CF", "Wales Sorting Centre", "Cardiff Delivery Depot"),
            ("EH1 1YZ", "EH", "Scotland Sorting Centre", "Edinburgh Delivery Depot"),
            ("BT1 5GS", "BT", "Northern Ireland Sorting Centre", "Belfast Delivery Depot"),
        ]

        for postcode, area, hub, depot in cases:
            with self.subTest(postcode=postcode):
                result = classify_geography(postcode)
                self.assertEqual(extract_postcode_area(postcode), area)
                self.assertEqual(result["postcodeArea"], area)
                self.assertEqual(result["hub"], hub)
                self.assertEqual(result["depot"], depot)
                self.assertEqual(result["route"], [hub, depot])

    def test_unknown_postcode_can_fall_back_to_address(self) -> None:
        result = classify_geography("UNKNOWN", city="", address="Canary Wharf, East London")

        self.assertEqual(result["postcodeArea"], "UNKNOWN")
        self.assertEqual(result["hub"], "London Sorting Centre")
        self.assertEqual(result["depot"], "East London Delivery Depot")
        self.assertEqual(result["confidence"], 0.65)

    def test_unknown_route_goes_to_manual_routing(self) -> None:
        result = classify_geography("UNKNOWN", city="Mystery City", address="Unknown address")

        self.assertEqual(result["postcodeArea"], "UNKNOWN")
        self.assertEqual(result["hub"], "Manual Routing")
        self.assertEqual(result["depot"], "Unknown Depot")
        self.assertIsNone(result["suggestedLane"])

    def test_overlapping_prefixes_use_longest_match(self) -> None:
        cases = [
            ("EC1A 1BB", "EC", "Central London Delivery Depot"),
            ("SW1A 1AA", "SW", "South West London Delivery Depot"),
            ("WC1A 1AA", "WC", "Central London Delivery Depot"),
        ]

        for postcode, area, depot in cases:
            with self.subTest(postcode=postcode):
                result = classify_geography(postcode)
                self.assertEqual(result["postcodeArea"], area)
                self.assertEqual(result["depot"], depot)

    def test_logistics_coordinator_keeps_route_when_handling_overrides(self) -> None:
        coordinator = LogisticsCoordinator()
        normal_decision = coordinator.coordinate([
            classify_geography("E14 5AB", "London"),
            {"agent": "cargo", "label": "Documents", "confidence": 0.88, "suggestedLane": None},
        ])
        self.assertEqual(normal_decision["finalLane"], "DEPOT_EAST_LONDON")
        self.assertEqual(
            normal_decision["route"],
            ["London Sorting Centre", "East London Delivery Depot"],
        )

        conflict_decision = coordinator.coordinate([
            classify_geography("NG7 2RD", "Nottingham"),
            {"agent": "cargo", "label": "Food", "confidence": 0.88, "suggestedLane": None},
            {
                "agent": "handling",
                "label": "Cold-chain + Priority",
                "confidence": 0.95,
                "suggestedLane": "COLD_CHAIN",
                "suggestedLanes": ["COLD_CHAIN", "EXPRESS"],
            },
        ])
        self.assertEqual(conflict_decision["finalLane"], "COLD_CHAIN")
        self.assertEqual(conflict_decision["depot"], "Nottingham Delivery Depot")
        self.assertEqual(conflict_decision["detectedConflicts"], ["COLD_CHAIN vs EXPRESS"])


if __name__ == "__main__":
    unittest.main()
