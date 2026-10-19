export const vehicles = {
  bike: { label: "Bike", kmPerLitre: 40, wearPerKm: 2 },
  rickshaw: { label: "Rickshaw", kmPerLitre: 25, wearPerKm: 3 },
  alto: { label: "Suzuki Alto", kmPerLitre: 18, wearPerKm: 5 },
  mehran: { label: "Suzuki Mehran", kmPerLitre: 14, wearPerKm: 5 },
  city: { label: "Honda City", kmPerLitre: 13, wearPerKm: 5 },
  corolla: { label: "Toyota Corolla", kmPerLitre: 12, wearPerKm: 5 },
};

export const fuelPricePerLitre = 386.3;

export function vehicleFor(id) {
  return vehicles[id] ?? vehicles.bike;
}
