import type { Lane, PackageInfo } from "./types";

export type DemoPackage = {
  id: string;
  name: string;
  packageInfo: PackageInfo;
  expectedLane: Lane;
  expectedHub: string;
  expectedDepot: string;
  expectedRoute: string[];
  expectedHandling: Lane | "NORMAL";
};

export const defaultPackage: PackageInfo = {
  addressLine: "Canary Wharf, East London",
  city: "London",
  postcode: "E14 5AB",
  cargoDescription: "legal documents",
  length: 30,
  width: 22,
  height: 4,
  weight: 0.8,
  fragile: false,
  coldChain: false,
  priority: false,
};

export const demoPackages: DemoPackage[] = [
  {
    id: "east-london",
    name: "East London package",
    packageInfo: defaultPackage,
    expectedLane: "DEPOT_EAST_LONDON",
    expectedHub: "London Sorting Centre",
    expectedDepot: "East London Delivery Depot",
    expectedRoute: ["London Sorting Centre", "East London Delivery Depot"],
    expectedHandling: "NORMAL",
  },
  {
    id: "central-london",
    name: "Central London package",
    packageInfo: {
      addressLine: "City of London",
      city: "London",
      postcode: "EC1A 1BB",
      cargoDescription: "invoice papers",
      length: 30,
      width: 22,
      height: 4,
      weight: 0.7,
      fragile: false,
      coldChain: false,
      priority: false,
    },
    expectedLane: "DEPOT_CENTRAL_LONDON",
    expectedHub: "London Sorting Centre",
    expectedDepot: "Central London Delivery Depot",
    expectedRoute: ["London Sorting Centre", "Central London Delivery Depot"],
    expectedHandling: "NORMAL",
  },
  {
    id: "nottingham-food",
    name: "Nottingham food package",
    packageInfo: {
      addressLine: "University Park, Nottingham",
      city: "Nottingham",
      postcode: "NG7 2RD",
      cargoDescription: "fresh apples",
      length: 35,
      width: 25,
      height: 20,
      weight: 4,
      fragile: false,
      coldChain: false,
      priority: false,
    },
    expectedLane: "DEPOT_NOTTINGHAM",
    expectedHub: "East Midlands Sorting Centre",
    expectedDepot: "Nottingham Delivery Depot",
    expectedRoute: ["East Midlands Sorting Centre", "Nottingham Delivery Depot"],
    expectedHandling: "NORMAL",
  },
  {
    id: "cardiff-medicine",
    name: "Cardiff medicine cold-chain",
    packageInfo: {
      addressLine: "Cardiff city centre",
      city: "Cardiff",
      postcode: "CF10 1EP",
      cargoDescription: "insulin package",
      length: 28,
      width: 18,
      height: 16,
      weight: 2.4,
      fragile: false,
      coldChain: true,
      priority: false,
    },
    expectedLane: "COLD_CHAIN",
    expectedHub: "Wales Sorting Centre",
    expectedDepot: "Cardiff Delivery Depot",
    expectedRoute: ["Wales Sorting Centre", "Cardiff Delivery Depot"],
    expectedHandling: "COLD_CHAIN",
  },
  {
    id: "manchester-fragile-electronics",
    name: "Manchester fragile electronics",
    packageInfo: {
      addressLine: "Deansgate, Manchester",
      city: "Manchester",
      postcode: "M1 1AE",
      cargoDescription: "laptop",
      length: 42,
      width: 30,
      height: 16,
      weight: 3.2,
      fragile: true,
      coldChain: false,
      priority: false,
    },
    expectedLane: "FRAGILE",
    expectedHub: "North West Sorting Centre",
    expectedDepot: "Manchester Delivery Depot",
    expectedRoute: ["North West Sorting Centre", "Manchester Delivery Depot"],
    expectedHandling: "FRAGILE",
  },
  {
    id: "conflict-heavy",
    name: "Conflict-heavy package",
    packageInfo: {
      addressLine: "University Park, Nottingham",
      city: "Nottingham",
      postcode: "NG7 2RD",
      cargoDescription: "frozen pizza",
      length: 40,
      width: 30,
      height: 20,
      weight: 5,
      fragile: false,
      coldChain: true,
      priority: true,
    },
    expectedLane: "COLD_CHAIN",
    expectedHub: "East Midlands Sorting Centre",
    expectedDepot: "Nottingham Delivery Depot",
    expectedRoute: ["East Midlands Sorting Centre", "Nottingham Delivery Depot"],
    expectedHandling: "COLD_CHAIN",
  },
];
