import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { judgeRide } from "./verdict.js";
import { fuelPricePerLitre, vehicleFor } from "./vehicles.js";
import { extractOffer, writeOfferNote } from "./gemma.js";
import { drive, geocode } from "./places.js";

const publicDir = resolve("public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export function loadEnv(file = ".env") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function gap(title, message, understood) {
  return { ok: false, title, message, understood };
}

export async function checkOffer(body, env = process.env) {
  const offerText = typeof body.offerText === "string" ? body.offerText.trim() : "";
  if (!offerText) {
    return gap("The offer is empty", "Paste the offer, or say it with the mic, then check it again.", null);
  }

  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  if (!apiKey) {
    return gap(
      "Gemma is not connected",
      "Add GEMINI_API_KEY to the .env file and start the server again. The fare maths will still be done in code, not by the model.",
      null,
    );
  }

  const vehicle = vehicleFor(body.vehicle);
  const fuelPrice = fuelPricePerLitre;

  let extracted;
  try {
    extracted = await extractOffer(apiKey, model, offerText);
  } catch (error) {
    return { ...gap("Gemma could not read the offer", error.message, null), sentToGemma: true };
  }

  const understood = {
    offerText,
    pickup: extracted.pickup,
    destination: extracted.destination,
    farePkr: extracted.farePkr,
    currentLocation: extracted.currentLocation,
    mapPickup: extracted.mapPickup,
    mapDestination: extracted.mapDestination,
    mapCurrent: extracted.mapCurrent,
    placeNote: extracted.placeNote,
  };

  const missing = [];
  if (!extracted.pickup) missing.push("a pickup");
  if (!extracted.destination) missing.push("a destination");
  if (extracted.farePkr == null) missing.push("a fare");
  if (missing.length > 0) {
    return {
      ...gap(
        "This offer is missing something",
        `Gemma found the offer, but it has no ${missing.join(" or ")}. The check stops there, so no fare or distance is invented.`,
        understood,
      ),
      sentToGemma: true,
    };
  }

  let pickup;
  let destination;
  let current = null;
  try {
    pickup = await geocode(extracted.pickup, extracted.mapPickup);
    destination = await geocode(extracted.destination, extracted.mapDestination);
    if (extracted.currentLocation) current = await geocode(extracted.currentLocation, extracted.mapCurrent);
  } catch (error) {
    return { ...gap("The map search failed", error.message, understood), sentToGemma: true };
  }

  if (!pickup || !destination) {
    const which = [!pickup ? extracted.pickup : null, !destination ? extracted.destination : null]
      .filter(Boolean)
      .join(" and ");
    return {
      ...gap(
        "A place could not be found",
        `No Karachi match for ${which}. The distance was not guessed.`,
        { ...understood, pickupLabel: pickup?.label ?? null, destinationLabel: destination?.label ?? null },
      ),
      sentToGemma: true,
    };
  }

  let passenger;
  let deadhead = null;
  try {
    passenger = await drive(pickup, destination);
    if (current) deadhead = await drive(current, pickup);
  } catch (error) {
    return { ...gap("The road route failed", error.message, understood), sentToGemma: true };
  }

  if (!passenger || (current && !deadhead)) {
    const title = !passenger ? "No road route" : "The unpaid ride could not be routed";
    const message = !passenger
      ? "The pickup and destination were found, but the road route between them was not. No distance was guessed."
      : "Where you are and the pickup were found, but not the road between them. No verdict was made, so that time would not be left out.";
    return {
      ...gap(title, message, {
        ...understood,
        pickupLabel: pickup.label,
        destinationLabel: destination.label,
        currentLabel: current?.label ?? null,
      }),
      sentToGemma: true,
    };
  }

  const judged = judgeRide({
    farePkr: extracted.farePkr,
    passengerKm: passenger.km,
    passengerMinutes: passenger.minutes,
    deadheadKm: deadhead ? deadhead.km : null,
    deadheadMinutes: deadhead ? deadhead.minutes : null,
    fuelPricePerLitre: fuelPrice,
    kmPerLitre: vehicle.kmPerLitre,
    wearPerKm: vehicle.wearPerKm,
  });

  const facts = {
    verdict: judged.verdict,
    farePkr: extracted.farePkr,
    youKeepPkr: judged.netPkr,
    petrolForThisRidePkr: judged.fuelCostPkr,
    minimumNetPkr: judged.minimumNetPkr,
    minutes: judged.minutes,
    passengerKm: Math.round(passenger.km * 10) / 10,
    deadheadCounted: judged.countedDeadhead,
    pickupSaid: extracted.pickup,
    pickupPlaced: pickup.label,
    destinationSaid: extracted.destination,
    destinationPlaced: destination.label,
    currentSaid: extracted.currentLocation,
    currentPlaced: current?.label ?? null,
    placeNote: extracted.placeNote,
    vehicle: vehicle.label,
    fuelPricePerLitre: fuelPrice,
    kmPerLitre: vehicle.kmPerLitre,
  };

  let offerNote = null;
  try {
    offerNote = await writeOfferNote(apiKey, model, facts);
  } catch {
    offerNote = null;
  }

  return {
    ok: true,
    sentToGemma: true,
    understood: {
      ...understood,
      pickupLabel: pickup.label,
      destinationLabel: destination.label,
      currentLabel: current?.label ?? null,
    },
    vehicle: { label: vehicle.label, kmPerLitre: vehicle.kmPerLitre, id: body.vehicle || "bike" },
    fuelPricePerLitre: fuelPrice,
    passenger: { km: passenger.km, minutes: passenger.minutes },
    deadhead: deadhead ? { km: deadhead.km, minutes: deadhead.minutes } : null,
    judged,
    offerNote,
    map: {
      passenger: passenger.geometry,
      deadhead: deadhead?.geometry ?? null,
    },
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = resolve(publicDir, `.${requested}`);
  if (target !== publicDir && !target.startsWith(publicDir + sep)) {
    send(res, 403, JSON.stringify({ ok: false, title: "No", message: "That file is outside the demo." }));
    return;
  }
  try {
    const file = await readFile(target);
    send(res, 200, file, types[extname(target)] || "application/octet-stream");
  } catch {
    send(res, 404, JSON.stringify({ ok: false, title: "Not found", message: "That page is not part of the demo." }));
  }
}

export function createApp() {
  return createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/check") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      let body = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        send(res, 400, JSON.stringify(gap("The check could not be read", "Send the offer as JSON.", null)));
        return;
      }
      try {
        const result = await checkOffer(body);
        send(res, 200, JSON.stringify(result));
      } catch (error) {
        send(res, 500, JSON.stringify(gap("The check stopped", error.message, null)));
      }
      return;
    }
    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }
    send(res, 405, JSON.stringify(gap("Not allowed", "Use the check form.", null)));
  });
}

const launchedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (launchedDirectly) {
  loadEnv();
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`RideWorth listening on http://localhost:${port}`);
  });
}
