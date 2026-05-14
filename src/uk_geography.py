import re
from typing import Dict, List, Optional, TypedDict


class GeographyClassification(TypedDict):
    agent: str
    label: str
    hub: str
    depot: str
    postcodeArea: str
    route: List[str]
    confidence: float
    suggestedLane: Optional[str]
    suggestedRoute: List[str]
    explanation: str


class SortingRoute(TypedDict):
    hub: str
    depot: str
    lane: str
    area_hint: str


ROUTE_MAP: Dict[str, SortingRoute] = {
    "E": {"hub": "London Sorting Centre", "depot": "East London Delivery Depot", "lane": "DEPOT_EAST_LONDON", "area_hint": "East London"},
    "EC": {"hub": "London Sorting Centre", "depot": "Central London Delivery Depot", "lane": "DEPOT_CENTRAL_LONDON", "area_hint": "Central London"},
    "N": {"hub": "London Sorting Centre", "depot": "North London Delivery Depot", "lane": "DEPOT_NORTH_LONDON", "area_hint": "North London"},
    "NW": {"hub": "London Sorting Centre", "depot": "North West London Delivery Depot", "lane": "DEPOT_NORTH_WEST_LONDON", "area_hint": "North West London"},
    "SE": {"hub": "London Sorting Centre", "depot": "South East London Delivery Depot", "lane": "DEPOT_SOUTH_EAST_LONDON", "area_hint": "South East London"},
    "SW": {"hub": "London Sorting Centre", "depot": "South West London Delivery Depot", "lane": "DEPOT_SOUTH_WEST_LONDON", "area_hint": "South West London"},
    "W": {"hub": "London Sorting Centre", "depot": "West London Delivery Depot", "lane": "DEPOT_WEST_LONDON", "area_hint": "West London"},
    "WC": {"hub": "London Sorting Centre", "depot": "Central London Delivery Depot", "lane": "DEPOT_CENTRAL_LONDON", "area_hint": "Central London"},
    "BR": {"hub": "London Sorting Centre", "depot": "Bromley Delivery Depot", "lane": "DEPOT_BROMLEY", "area_hint": "Bromley"},
    "CR": {"hub": "London Sorting Centre", "depot": "Croydon Delivery Depot", "lane": "DEPOT_CROYDON", "area_hint": "Croydon"},
    "NG": {"hub": "East Midlands Sorting Centre", "depot": "Nottingham Delivery Depot", "lane": "DEPOT_NOTTINGHAM", "area_hint": "Nottingham"},
    "LE": {"hub": "East Midlands Sorting Centre", "depot": "Leicester Delivery Depot", "lane": "DEPOT_LEICESTER", "area_hint": "Leicester"},
    "DE": {"hub": "East Midlands Sorting Centre", "depot": "Derby Delivery Depot", "lane": "DEPOT_DERBY", "area_hint": "Derby"},
    "LN": {"hub": "East Midlands Sorting Centre", "depot": "Lincoln Delivery Depot", "lane": "DEPOT_LINCOLN", "area_hint": "Lincoln"},
    "B": {"hub": "West Midlands Sorting Centre", "depot": "Birmingham Delivery Depot", "lane": "DEPOT_BIRMINGHAM", "area_hint": "Birmingham"},
    "CV": {"hub": "West Midlands Sorting Centre", "depot": "Coventry Delivery Depot", "lane": "DEPOT_COVENTRY", "area_hint": "Coventry"},
    "ST": {"hub": "West Midlands Sorting Centre", "depot": "Stoke-on-Trent Delivery Depot", "lane": "DEPOT_STOKE_ON_TRENT", "area_hint": "Stoke-on-Trent"},
    "WS": {"hub": "West Midlands Sorting Centre", "depot": "Walsall Delivery Depot", "lane": "DEPOT_WALSALL", "area_hint": "Walsall"},
    "M": {"hub": "North West Sorting Centre", "depot": "Manchester Delivery Depot", "lane": "DEPOT_MANCHESTER", "area_hint": "Manchester"},
    "L": {"hub": "North West Sorting Centre", "depot": "Liverpool Delivery Depot", "lane": "DEPOT_LIVERPOOL", "area_hint": "Liverpool"},
    "PR": {"hub": "North West Sorting Centre", "depot": "Preston Delivery Depot", "lane": "DEPOT_PRESTON", "area_hint": "Preston"},
    "LA": {"hub": "North West Sorting Centre", "depot": "Lancaster Delivery Depot", "lane": "DEPOT_LANCASTER", "area_hint": "Lancaster"},
    "S": {"hub": "Yorkshire Sorting Centre", "depot": "Sheffield Delivery Depot", "lane": "DEPOT_SHEFFIELD", "area_hint": "Sheffield"},
    "LS": {"hub": "Yorkshire Sorting Centre", "depot": "Leeds Delivery Depot", "lane": "DEPOT_LEEDS", "area_hint": "Leeds"},
    "YO": {"hub": "Yorkshire Sorting Centre", "depot": "York Delivery Depot", "lane": "DEPOT_YORK", "area_hint": "York"},
    "HU": {"hub": "Yorkshire Sorting Centre", "depot": "Hull Delivery Depot", "lane": "DEPOT_HULL", "area_hint": "Hull"},
    "NE": {"hub": "North East Sorting Centre", "depot": "Newcastle Delivery Depot", "lane": "DEPOT_NEWCASTLE", "area_hint": "Newcastle"},
    "DH": {"hub": "North East Sorting Centre", "depot": "Durham Delivery Depot", "lane": "DEPOT_DURHAM", "area_hint": "Durham"},
    "SR": {"hub": "North East Sorting Centre", "depot": "Sunderland Delivery Depot", "lane": "DEPOT_SUNDERLAND", "area_hint": "Sunderland"},
    "OX": {"hub": "South East Sorting Centre", "depot": "Oxford Delivery Depot", "lane": "DEPOT_OXFORD", "area_hint": "Oxford"},
    "RG": {"hub": "South East Sorting Centre", "depot": "Reading Delivery Depot", "lane": "DEPOT_READING", "area_hint": "Reading"},
    "SO": {"hub": "South East Sorting Centre", "depot": "Southampton Delivery Depot", "lane": "DEPOT_SOUTHAMPTON", "area_hint": "Southampton"},
    "BN": {"hub": "South East Sorting Centre", "depot": "Brighton Delivery Depot", "lane": "DEPOT_BRIGHTON", "area_hint": "Brighton"},
    "GU": {"hub": "South East Sorting Centre", "depot": "Guildford Delivery Depot", "lane": "DEPOT_GUILDFORD", "area_hint": "Guildford"},
    "TN": {"hub": "South East Sorting Centre", "depot": "Tunbridge Wells Delivery Depot", "lane": "DEPOT_TUNBRIDGE_WELLS", "area_hint": "Tunbridge Wells"},
    "BS": {"hub": "South West Sorting Centre", "depot": "Bristol Delivery Depot", "lane": "DEPOT_BRISTOL", "area_hint": "Bristol"},
    "EX": {"hub": "South West Sorting Centre", "depot": "Exeter Delivery Depot", "lane": "DEPOT_EXETER", "area_hint": "Exeter"},
    "PL": {"hub": "South West Sorting Centre", "depot": "Plymouth Delivery Depot", "lane": "DEPOT_PLYMOUTH", "area_hint": "Plymouth"},
    "TR": {"hub": "South West Sorting Centre", "depot": "Truro Delivery Depot", "lane": "DEPOT_TRURO", "area_hint": "Truro"},
    "BA": {"hub": "South West Sorting Centre", "depot": "Bath Delivery Depot", "lane": "DEPOT_BATH", "area_hint": "Bath"},
    "NR": {"hub": "East of England Sorting Centre", "depot": "Norwich Delivery Depot", "lane": "DEPOT_NORWICH", "area_hint": "Norwich"},
    "CB": {"hub": "East of England Sorting Centre", "depot": "Cambridge Delivery Depot", "lane": "DEPOT_CAMBRIDGE", "area_hint": "Cambridge"},
    "IP": {"hub": "East of England Sorting Centre", "depot": "Ipswich Delivery Depot", "lane": "DEPOT_IPSWICH", "area_hint": "Ipswich"},
    "PE": {"hub": "East of England Sorting Centre", "depot": "Peterborough Delivery Depot", "lane": "DEPOT_PETERBOROUGH", "area_hint": "Peterborough"},
    "CM": {"hub": "East of England Sorting Centre", "depot": "Chelmsford Delivery Depot", "lane": "DEPOT_CHELMSFORD", "area_hint": "Chelmsford"},
    "EH": {"hub": "Scotland Sorting Centre", "depot": "Edinburgh Delivery Depot", "lane": "DEPOT_EDINBURGH", "area_hint": "Edinburgh"},
    "G": {"hub": "Scotland Sorting Centre", "depot": "Glasgow Delivery Depot", "lane": "DEPOT_GLASGOW", "area_hint": "Glasgow"},
    "AB": {"hub": "Scotland Sorting Centre", "depot": "Aberdeen Delivery Depot", "lane": "DEPOT_ABERDEEN", "area_hint": "Aberdeen"},
    "DD": {"hub": "Scotland Sorting Centre", "depot": "Dundee Delivery Depot", "lane": "DEPOT_DUNDEE", "area_hint": "Dundee"},
    "IV": {"hub": "Scotland Sorting Centre", "depot": "Inverness Delivery Depot", "lane": "DEPOT_INVERNESS", "area_hint": "Inverness"},
    "CF": {"hub": "Wales Sorting Centre", "depot": "Cardiff Delivery Depot", "lane": "DEPOT_CARDIFF", "area_hint": "Cardiff"},
    "SA": {"hub": "Wales Sorting Centre", "depot": "Swansea Delivery Depot", "lane": "DEPOT_SWANSEA", "area_hint": "Swansea"},
    "LL": {"hub": "Wales Sorting Centre", "depot": "North Wales Delivery Depot", "lane": "DEPOT_NORTH_WALES", "area_hint": "North Wales"},
    "NP": {"hub": "Wales Sorting Centre", "depot": "Newport Delivery Depot", "lane": "DEPOT_NEWPORT", "area_hint": "Newport"},
    "BT": {"hub": "Northern Ireland Sorting Centre", "depot": "Belfast Delivery Depot", "lane": "DEPOT_BELFAST", "area_hint": "Belfast"},
}

FALLBACK_KEYWORDS: Dict[str, str] = {
    "east london": "E",
    "central london": "EC",
    "city of london": "EC",
    "nottingham": "NG",
    "manchester": "M",
    "cardiff": "CF",
    "edinburgh": "EH",
}

KNOWN_AREAS_BY_LENGTH = sorted(ROUTE_MAP.keys(), key=len, reverse=True)


def extract_postcode_area(postcode: str) -> str:
    normalized = postcode.strip().upper()
    match = re.match(r"^([A-Z]+)", normalized)

    if not match:
        return "UNKNOWN"

    leading_letters = match.group(1)
    for area in KNOWN_AREAS_BY_LENGTH:
        if leading_letters.startswith(area):
            return area

    return "UNKNOWN"


def _result_from_route(route_info: SortingRoute, postcode_area: str, confidence: float, explanation: str) -> GeographyClassification:
    route = [route_info["hub"], route_info["depot"]]
    return {
        "agent": "geography",
        "label": route_info["depot"],
        "hub": route_info["hub"],
        "depot": route_info["depot"],
        "postcodeArea": postcode_area,
        "route": route,
        "confidence": confidence,
        "suggestedLane": route_info["lane"],
        "suggestedRoute": route,
        "explanation": explanation,
    }


def _infer_area_from_address(address: str, city: str) -> Optional[str]:
    text = f"{address} {city}".strip().lower()
    return next((area for keyword, area in FALLBACK_KEYWORDS.items() if keyword in text), None)


def classify_geography(postcode: str, city: str = "", address: str = "") -> GeographyClassification:
    postcode_area = extract_postcode_area(postcode)
    route_info = ROUTE_MAP.get(postcode_area)

    if route_info:
        explanation = (
            f"Postcode area {postcode_area} indicates {route_info['area_hint']}. "
            f"The package is first routed to {route_info['hub']}, then to {route_info['depot']}."
        )
        return _result_from_route(route_info, postcode_area, 0.92, explanation)

    fallback_area = _infer_area_from_address(address, city)
    if fallback_area:
        fallback_route = ROUTE_MAP[fallback_area]
        explanation = (
            "The postcode area could not be matched, but the address or city "
            f"suggests {fallback_route['area_hint']}, so the route was inferred with lower confidence."
        )
        return _result_from_route(fallback_route, "UNKNOWN", 0.65, explanation)

    return {
        "agent": "geography",
        "label": "Unknown",
        "hub": "Manual Routing",
        "depot": "Unknown Depot",
        "postcodeArea": "UNKNOWN",
        "route": ["Manual Routing"],
        "confidence": 0.35,
        "suggestedLane": None,
        "suggestedRoute": ["Manual Routing"],
        "explanation": "The address and postcode could not be matched to a known sorting route.",
    }
