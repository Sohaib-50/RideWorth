import test from "node:test";
import assert from "node:assert/strict";
import { mapQueries } from "./places.js";

test("a misspelled chorangi is also searched as Chowrangi", () => {
  const queries = mapQueries("jail chorangi", "Jail Chowrangi");
  assert.deepEqual(queries, ["Jail Chowrangi", "jail chorangi"]);
});
