import type { Lane } from "./types";

export type SortingRoute = {
  hub: string;
  depot: string;
  lane: Lane;
  areaHint: string;
};

export const routeMap: Record<string, SortingRoute> = {
  E: { hub: "London Sorting Centre", depot: "East London Delivery Depot", lane: "DEPOT_EAST_LONDON", areaHint: "East London" },
  EC: { hub: "London Sorting Centre", depot: "Central London Delivery Depot", lane: "DEPOT_CENTRAL_LONDON", areaHint: "Central London" },
  N: { hub: "London Sorting Centre", depot: "North London Delivery Depot", lane: "DEPOT_NORTH_LONDON", areaHint: "North London" },
  NW: { hub: "London Sorting Centre", depot: "North West London Delivery Depot", lane: "DEPOT_NORTH_WEST_LONDON", areaHint: "North West London" },
  SE: { hub: "London Sorting Centre", depot: "South East London Delivery Depot", lane: "DEPOT_SOUTH_EAST_LONDON", areaHint: "South East London" },
  SW: { hub: "London Sorting Centre", depot: "South West London Delivery Depot", lane: "DEPOT_SOUTH_WEST_LONDON", areaHint: "South West London" },
  W: { hub: "London Sorting Centre", depot: "West London Delivery Depot", lane: "DEPOT_WEST_LONDON", areaHint: "West London" },
  WC: { hub: "London Sorting Centre", depot: "Central London Delivery Depot", lane: "DEPOT_CENTRAL_LONDON", areaHint: "Central London" },
  BR: { hub: "London Sorting Centre", depot: "Bromley Delivery Depot", lane: "DEPOT_BROMLEY", areaHint: "Bromley" },
  CR: { hub: "London Sorting Centre", depot: "Croydon Delivery Depot", lane: "DEPOT_CROYDON", areaHint: "Croydon" },
  NG: { hub: "East Midlands Sorting Centre", depot: "Nottingham Delivery Depot", lane: "DEPOT_NOTTINGHAM", areaHint: "Nottingham" },
  LE: { hub: "East Midlands Sorting Centre", depot: "Leicester Delivery Depot", lane: "DEPOT_LEICESTER", areaHint: "Leicester" },
  DE: { hub: "East Midlands Sorting Centre", depot: "Derby Delivery Depot", lane: "DEPOT_DERBY", areaHint: "Derby" },
  LN: { hub: "East Midlands Sorting Centre", depot: "Lincoln Delivery Depot", lane: "DEPOT_LINCOLN", areaHint: "Lincoln" },
  B: { hub: "West Midlands Sorting Centre", depot: "Birmingham Delivery Depot", lane: "DEPOT_BIRMINGHAM", areaHint: "Birmingham" },
  CV: { hub: "West Midlands Sorting Centre", depot: "Coventry Delivery Depot", lane: "DEPOT_COVENTRY", areaHint: "Coventry" },
  ST: { hub: "West Midlands Sorting Centre", depot: "Stoke-on-Trent Delivery Depot", lane: "DEPOT_STOKE_ON_TRENT", areaHint: "Stoke-on-Trent" },
  WS: { hub: "West Midlands Sorting Centre", depot: "Walsall Delivery Depot", lane: "DEPOT_WALSALL", areaHint: "Walsall" },
  M: { hub: "North West Sorting Centre", depot: "Manchester Delivery Depot", lane: "DEPOT_MANCHESTER", areaHint: "Manchester" },
  L: { hub: "North West Sorting Centre", depot: "Liverpool Delivery Depot", lane: "DEPOT_LIVERPOOL", areaHint: "Liverpool" },
  PR: { hub: "North West Sorting Centre", depot: "Preston Delivery Depot", lane: "DEPOT_PRESTON", areaHint: "Preston" },
  LA: { hub: "North West Sorting Centre", depot: "Lancaster Delivery Depot", lane: "DEPOT_LANCASTER", areaHint: "Lancaster" },
  S: { hub: "Yorkshire Sorting Centre", depot: "Sheffield Delivery Depot", lane: "DEPOT_SHEFFIELD", areaHint: "Sheffield" },
  LS: { hub: "Yorkshire Sorting Centre", depot: "Leeds Delivery Depot", lane: "DEPOT_LEEDS", areaHint: "Leeds" },
  YO: { hub: "Yorkshire Sorting Centre", depot: "York Delivery Depot", lane: "DEPOT_YORK", areaHint: "York" },
  HU: { hub: "Yorkshire Sorting Centre", depot: "Hull Delivery Depot", lane: "DEPOT_HULL", areaHint: "Hull" },
  NE: { hub: "North East Sorting Centre", depot: "Newcastle Delivery Depot", lane: "DEPOT_NEWCASTLE", areaHint: "Newcastle" },
  DH: { hub: "North East Sorting Centre", depot: "Durham Delivery Depot", lane: "DEPOT_DURHAM", areaHint: "Durham" },
  SR: { hub: "North East Sorting Centre", depot: "Sunderland Delivery Depot", lane: "DEPOT_SUNDERLAND", areaHint: "Sunderland" },
  OX: { hub: "South East Sorting Centre", depot: "Oxford Delivery Depot", lane: "DEPOT_OXFORD", areaHint: "Oxford" },
  RG: { hub: "South East Sorting Centre", depot: "Reading Delivery Depot", lane: "DEPOT_READING", areaHint: "Reading" },
  SO: { hub: "South East Sorting Centre", depot: "Southampton Delivery Depot", lane: "DEPOT_SOUTHAMPTON", areaHint: "Southampton" },
  BN: { hub: "South East Sorting Centre", depot: "Brighton Delivery Depot", lane: "DEPOT_BRIGHTON", areaHint: "Brighton" },
  GU: { hub: "South East Sorting Centre", depot: "Guildford Delivery Depot", lane: "DEPOT_GUILDFORD", areaHint: "Guildford" },
  TN: { hub: "South East Sorting Centre", depot: "Tunbridge Wells Delivery Depot", lane: "DEPOT_TUNBRIDGE_WELLS", areaHint: "Tunbridge Wells" },
  BS: { hub: "South West Sorting Centre", depot: "Bristol Delivery Depot", lane: "DEPOT_BRISTOL", areaHint: "Bristol" },
  EX: { hub: "South West Sorting Centre", depot: "Exeter Delivery Depot", lane: "DEPOT_EXETER", areaHint: "Exeter" },
  PL: { hub: "South West Sorting Centre", depot: "Plymouth Delivery Depot", lane: "DEPOT_PLYMOUTH", areaHint: "Plymouth" },
  TR: { hub: "South West Sorting Centre", depot: "Truro Delivery Depot", lane: "DEPOT_TRURO", areaHint: "Truro" },
  BA: { hub: "South West Sorting Centre", depot: "Bath Delivery Depot", lane: "DEPOT_BATH", areaHint: "Bath" },
  NR: { hub: "East of England Sorting Centre", depot: "Norwich Delivery Depot", lane: "DEPOT_NORWICH", areaHint: "Norwich" },
  CB: { hub: "East of England Sorting Centre", depot: "Cambridge Delivery Depot", lane: "DEPOT_CAMBRIDGE", areaHint: "Cambridge" },
  IP: { hub: "East of England Sorting Centre", depot: "Ipswich Delivery Depot", lane: "DEPOT_IPSWICH", areaHint: "Ipswich" },
  PE: { hub: "East of England Sorting Centre", depot: "Peterborough Delivery Depot", lane: "DEPOT_PETERBOROUGH", areaHint: "Peterborough" },
  CM: { hub: "East of England Sorting Centre", depot: "Chelmsford Delivery Depot", lane: "DEPOT_CHELMSFORD", areaHint: "Chelmsford" },
  EH: { hub: "Scotland Sorting Centre", depot: "Edinburgh Delivery Depot", lane: "DEPOT_EDINBURGH", areaHint: "Edinburgh" },
  G: { hub: "Scotland Sorting Centre", depot: "Glasgow Delivery Depot", lane: "DEPOT_GLASGOW", areaHint: "Glasgow" },
  AB: { hub: "Scotland Sorting Centre", depot: "Aberdeen Delivery Depot", lane: "DEPOT_ABERDEEN", areaHint: "Aberdeen" },
  DD: { hub: "Scotland Sorting Centre", depot: "Dundee Delivery Depot", lane: "DEPOT_DUNDEE", areaHint: "Dundee" },
  IV: { hub: "Scotland Sorting Centre", depot: "Inverness Delivery Depot", lane: "DEPOT_INVERNESS", areaHint: "Inverness" },
  CF: { hub: "Wales Sorting Centre", depot: "Cardiff Delivery Depot", lane: "DEPOT_CARDIFF", areaHint: "Cardiff" },
  SA: { hub: "Wales Sorting Centre", depot: "Swansea Delivery Depot", lane: "DEPOT_SWANSEA", areaHint: "Swansea" },
  LL: { hub: "Wales Sorting Centre", depot: "North Wales Delivery Depot", lane: "DEPOT_NORTH_WALES", areaHint: "North Wales" },
  NP: { hub: "Wales Sorting Centre", depot: "Newport Delivery Depot", lane: "DEPOT_NEWPORT", areaHint: "Newport" },
  BT: { hub: "Northern Ireland Sorting Centre", depot: "Belfast Delivery Depot", lane: "DEPOT_BELFAST", areaHint: "Belfast" },
};

const fallbackKeywords: Record<string, string> = {
  "east london": "E",
  "central london": "EC",
  "city of london": "EC",
  nottingham: "NG",
  manchester: "M",
  cardiff: "CF",
  edinburgh: "EH",
};

const knownAreasByLength = Object.keys(routeMap).sort((a, b) => b.length - a.length);

export function extractPostcodeArea(postcode: string): string {
  const normalized = postcode.trim().toUpperCase();
  const leadingLetters = normalized.match(/^[A-Z]+/)?.[0] ?? "";

  if (!leadingLetters) {
    return "UNKNOWN";
  }

  return knownAreasByLength.find((area) => leadingLetters.startsWith(area)) ?? "UNKNOWN";
}

export function inferRouteFromAddress(addressLine: string, city: string): SortingRoute | null {
  const text = `${addressLine} ${city}`.trim().toLowerCase();
  const match = Object.entries(fallbackKeywords).find(([keyword]) => text.includes(keyword));

  return match ? routeMap[match[1]] : null;
}
