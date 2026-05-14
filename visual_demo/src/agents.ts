import type { AgentOutput, PackageInfo } from "./types";
import { extractPostcodeArea, inferRouteFromAddress, routeMap } from "./ukGeography";

const matchKeywords = (description: string, keywords: string[]) =>
  keywords.filter((keyword) => description.includes(keyword));

export function runGeographyAgent(pkg: PackageInfo): AgentOutput {
  const postcode = pkg.postcode.trim().toUpperCase();
  const postcodeArea = extractPostcodeArea(postcode);
  const mappedRoute = routeMap[postcodeArea];

  if (mappedRoute) {
    const route = [mappedRoute.hub, mappedRoute.depot];
    return {
      agent: "Geography Agent",
      inputUsed: `postcode ${postcode || "not supplied"}`,
      label: mappedRoute.depot,
      hub: mappedRoute.hub,
      depot: mappedRoute.depot,
      postcodeArea,
      route,
      confidence: 0.92,
      suggestedLane: mappedRoute.lane,
      explanation: `Postcode area ${postcodeArea} indicates ${mappedRoute.areaHint}. The package is first routed to ${mappedRoute.hub}, then to ${mappedRoute.depot}.`,
    };
  }

  const fallbackRoute = inferRouteFromAddress(pkg.addressLine, pkg.city);
  if (fallbackRoute) {
    const route = [fallbackRoute.hub, fallbackRoute.depot];
    return {
      agent: "Geography Agent",
      inputUsed: `${pkg.addressLine || "address not supplied"}, ${pkg.city || "city not supplied"}`,
      label: fallbackRoute.depot,
      hub: fallbackRoute.hub,
      depot: fallbackRoute.depot,
      postcodeArea: "UNKNOWN",
      route,
      confidence: 0.65,
      suggestedLane: fallbackRoute.lane,
      explanation: `The postcode area could not be matched, but the address or city suggests ${fallbackRoute.areaHint}, so the route was inferred with lower confidence.`,
    };
  }

  return {
    agent: "Geography Agent",
    inputUsed: `${pkg.addressLine || "address not supplied"}, ${pkg.city || "city not supplied"}`,
    label: "Unknown",
    hub: "Manual Routing",
    depot: "Unknown Depot",
    postcodeArea: "UNKNOWN",
    route: ["Manual Routing"],
    confidence: 0.35,
    suggestedLane: null,
    explanation: "The address and postcode could not be matched to a known sorting route.",
  };
}

export function runCargoTypeAgent(pkg: PackageInfo): AgentOutput {
  const description = pkg.cargoDescription.trim().toLowerCase();
  const categories = [
    {
      label: "Medicine",
      keywords: ["insulin", "medical", "medicine", "prescription", "vaccine"],
    },
    {
      label: "Food",
      keywords: [
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
    },
    {
      label: "Electronics",
      keywords: ["laptop", "charger", "phone", "headphones", "camera", "battery"],
    },
    {
      label: "Clothing",
      keywords: ["shirt", "jacket", "shoes", "hoodie", "trousers"],
    },
    {
      label: "Documents",
      keywords: ["document", "transcript", "invoice", "paper", "contract"],
    },
  ];

  const bestMatch = categories
    .map((category, priority) => ({
      ...category,
      priority,
      matches: matchKeywords(description, category.keywords),
    }))
    .filter((category) => category.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || a.priority - b.priority)[0];

  if (bestMatch) {
    const confidence = Math.min(0.94, 0.75 + bestMatch.matches.length * 0.07);
    return {
      agent: "Cargo Type Agent",
      inputUsed: `"${pkg.cargoDescription || "not supplied"}"`,
      label: bestMatch.label,
      confidence,
      suggestedLane: null,
      explanation: `The description contains ${bestMatch.label.toLowerCase()}-related keywords: ${bestMatch.matches.join(
        ", ",
      )}.`,
    };
  }

  return {
    agent: "Cargo Type Agent",
    inputUsed: `"${pkg.cargoDescription || "not supplied"}"`,
    label: "General Goods",
    confidence: description ? 0.52 : 0.35,
    suggestedLane: null,
    explanation: description
      ? "No specialist cargo keywords were found, so the package is treated as general goods."
      : "No cargo description was supplied.",
  };
}

export function runSizeAgent(pkg: PackageInfo): AgentOutput {
  const volume = pkg.length * pkg.width * pkg.height;
  const isOversized = volume > 200000 || pkg.weight > 20;

  if (isOversized) {
    return {
      agent: "Size Agent",
      inputUsed: `${pkg.length} x ${pkg.width} x ${pkg.height} cm, ${pkg.weight} kg`,
      label: "Oversized",
      confidence: 0.9,
      suggestedLane: "OVERSIZED",
      explanation:
        "The package exceeds the configured size or weight threshold and should be routed to oversized handling.",
    };
  }

  return {
    agent: "Size Agent",
    inputUsed: `${pkg.length} x ${pkg.width} x ${pkg.height} cm, ${pkg.weight} kg`,
    label: "Standard",
    confidence: 0.85,
    suggestedLane: null,
    explanation: "The package is within the standard volume and weight thresholds.",
  };
}

export function runHandlingAgent(pkg: PackageInfo): AgentOutput {
  const suggestedLanes = [
    ...(pkg.coldChain ? (["COLD_CHAIN"] as const) : []),
    ...(pkg.fragile ? (["FRAGILE"] as const) : []),
    ...(pkg.priority ? (["EXPRESS"] as const) : []),
  ];

  if (pkg.coldChain) {
    return {
      agent: "Handling Agent",
      inputUsed: "cold-chain flag",
      label: pkg.priority ? "Cold-chain + Priority" : "Cold-chain",
      confidence: 0.95,
      suggestedLane: "COLD_CHAIN",
      suggestedLanes,
      explanation: pkg.priority
        ? "Cold-chain and priority flags are both active; cold-chain is the highest safety priority, while express handling is still reported as a triggered lane."
        : "Cold-chain goods require temperature-controlled routing before other handling preferences.",
    };
  }

  if (pkg.fragile) {
    return {
      agent: "Handling Agent",
      inputUsed: "fragile flag",
      label: "Fragile",
      confidence: 0.9,
      suggestedLane: "FRAGILE",
      suggestedLanes,
      explanation: "Fragile goods should be routed to careful handling to reduce damage risk.",
    };
  }

  if (pkg.priority) {
    return {
      agent: "Handling Agent",
      inputUsed: "priority flag",
      label: "Priority",
      confidence: 0.85,
      suggestedLane: "EXPRESS",
      suggestedLanes,
      explanation: "Priority goods are routed to the express lane when no stronger safety constraint is active.",
    };
  }

  return {
    agent: "Handling Agent",
    inputUsed: "handling flags",
    label: "Normal",
    confidence: 0.8,
    suggestedLane: null,
    explanation: "No special handling flag is active, so normal handling is suitable.",
  };
}

export function runSpecialistAgents(pkg: PackageInfo): AgentOutput[] {
  return [
    runGeographyAgent(pkg),
    runCargoTypeAgent(pkg),
    runSizeAgent(pkg),
    runHandlingAgent(pkg),
  ];
}
