import test from "node:test";
import assert from "node:assert/strict";
import { judgeRide } from "./verdict.js";

test("a 30 minute ride that clears 200 PKR net is a Take", () => {
  const result = judgeRide({
    farePkr: 480,
    passengerKm: 40,
    passengerMinutes: 30,
    deadheadKm: null,
    deadheadMinutes: null,
    fuelPricePerLitre: 200,
    kmPerLitre: 40,
    wearPerKm: 2,
  });

  assert.equal(result.fuelCostPkr, 200);
  assert.equal(result.wearCostPkr, 80);
  assert.equal(result.netPkr, 200);
  assert.equal(result.minutes, 30);
  assert.equal(result.minimumNetPkr, 200);
  assert.equal(result.verdict, "Take");
  assert.equal(result.countedDeadhead, false);
});

test("a positive net under the time bar is Thin, and zero is Thin too", () => {
  const shared = {
    passengerKm: 40,
    passengerMinutes: 30,
    deadheadKm: null,
    deadheadMinutes: null,
    fuelPricePerLitre: 200,
    kmPerLitre: 40,
    wearPerKm: 2,
  };

  assert.equal(judgeRide({ ...shared, farePkr: 400 }).verdict, "Thin");
  assert.equal(judgeRide({ ...shared, farePkr: 400 }).netPkr, 120);
  assert.equal(judgeRide({ ...shared, farePkr: 280 }).verdict, "Thin");
  assert.equal(judgeRide({ ...shared, farePkr: 280 }).netPkr, 0);
});

test("a ride that loses money is a Skip", () => {
  const result = judgeRide({
    farePkr: 200,
    passengerKm: 40,
    passengerMinutes: 30,
    deadheadKm: null,
    deadheadMinutes: null,
    fuelPricePerLitre: 200,
    kmPerLitre: 40,
    wearPerKm: 2,
  });

  assert.equal(result.netPkr, -80);
  assert.equal(result.verdict, "Skip");
});

test("a known deadhead raises the minutes and the costs", () => {
  const result = judgeRide({
    farePkr: 720,
    passengerKm: 40,
    passengerMinutes: 30,
    deadheadKm: 20,
    deadheadMinutes: 15,
    fuelPricePerLitre: 200,
    kmPerLitre: 40,
    wearPerKm: 2,
  });

  assert.equal(result.fuelCostPkr, 300);
  assert.equal(result.wearCostPkr, 120);
  assert.equal(result.netPkr, 300);
  assert.equal(result.minutes, 45);
  assert.equal(result.minimumNetPkr, 300);
  assert.equal(result.verdict, "Take");
  assert.equal(result.countedDeadhead, true);
});

test("a fraction of a rupee under the fare is a Skip", () => {
  const result = judgeRide({
    farePkr: 84,
    passengerKm: 10.2,
    passengerMinutes: 15,
    deadheadKm: null,
    deadheadMinutes: null,
    fuelPricePerLitre: 250,
    kmPerLitre: 40,
    wearPerKm: 2,
  });

  assert.equal(result.fuelCostPkr, 64);
  assert.equal(result.wearCostPkr, 21);
  assert.equal(result.netPkr, -1);
  assert.equal(result.verdict, "Skip");
});
