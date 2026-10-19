function rupeeUp(amount) {
  return Math.ceil(amount - 1e-9);
}

export function judgeRide(input) {
  const countedDeadhead = input.deadheadKm != null && input.deadheadMinutes != null;
  const distanceKm = input.passengerKm + (countedDeadhead ? input.deadheadKm : 0);
  const minutes = Math.round(input.passengerMinutes + (countedDeadhead ? input.deadheadMinutes : 0));
  const fuelCostPkr = rupeeUp((distanceKm / input.kmPerLitre) * input.fuelPricePerLitre);
  const wearCostPkr = rupeeUp(distanceKm * input.wearPerKm);
  const netPkr = input.farePkr - fuelCostPkr - wearCostPkr;
  const minimumNetPkr = Math.round((minutes / 15) * 100);

  let verdict = "Thin";
  if (netPkr < 0) verdict = "Skip";
  else if (netPkr >= minimumNetPkr) verdict = "Take";

  return {
    fuelCostPkr,
    wearCostPkr,
    netPkr,
    minutes,
    minimumNetPkr,
    verdict,
    countedDeadhead,
  };
}
