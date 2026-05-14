import assert from "node:assert/strict";
import { extractPostcodeArea, inferRouteFromAddress, routeMap } from "../src/ukGeography";

const cases = [
  ["E14 5AB", "E", "London Sorting Centre", "East London Delivery Depot"],
  ["EC1A 1BB", "EC", "London Sorting Centre", "Central London Delivery Depot"],
  ["SW1A 1AA", "SW", "London Sorting Centre", "South West London Delivery Depot"],
  ["NG7 2RD", "NG", "East Midlands Sorting Centre", "Nottingham Delivery Depot"],
  ["CF10 1EP", "CF", "Wales Sorting Centre", "Cardiff Delivery Depot"],
  ["EH1 1YZ", "EH", "Scotland Sorting Centre", "Edinburgh Delivery Depot"],
  ["BT1 5GS", "BT", "Northern Ireland Sorting Centre", "Belfast Delivery Depot"],
] as const;

for (const [postcode, area, hub, depot] of cases) {
  const actualArea = extractPostcodeArea(postcode);
  assert.equal(actualArea, area, `${postcode} should parse as ${area}`);
  assert.equal(routeMap[actualArea].hub, hub);
  assert.equal(routeMap[actualArea].depot, depot);
}

assert.equal(extractPostcodeArea("UNKNOWN"), "UNKNOWN");

const fallbackRoute = inferRouteFromAddress("Canary Wharf, East London", "");
assert.equal(fallbackRoute?.hub, "London Sorting Centre");
assert.equal(fallbackRoute?.depot, "East London Delivery Depot");

const overlapCases = [
  ["EC1A 1BB", "EC", "Central London Delivery Depot"],
  ["SW1A 1AA", "SW", "South West London Delivery Depot"],
  ["WC1A 1AA", "WC", "Central London Delivery Depot"],
] as const;

for (const [postcode, area, depot] of overlapCases) {
  const actualArea = extractPostcodeArea(postcode);
  assert.equal(actualArea, area, `${postcode} should use longest prefix ${area}`);
  assert.equal(routeMap[actualArea].depot, depot);
}

console.log("UK logistics route parser tests passed.");
