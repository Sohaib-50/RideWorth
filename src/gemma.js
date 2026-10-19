const endpoint = "https://generativelanguage.googleapis.com/v1beta/models";

function parseJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemma did not return the offer as JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function asText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFare(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

async function generate(apiKey, model, prompt, { json = false } = {}) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: json ? 0.2 : 0.4,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  };

  const response = await fetch(`${endpoint}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `Gemma request failed (${response.status}).`;
    throw new Error(message);
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text).filter(Boolean).join("\n").trim();
  if (!text) throw new Error("Gemma returned an empty reply.");
  return text;
}

export async function extractOffer(apiKey, model, offerText) {
  const prompt = `Extract one ride offer for a driver in Karachi, Pakistan.
The offer may be English or Roman Urdu.
Return only a JSON object with these keys:
{"pickup": string|null, "destination": string|null, "farePkr": number|null, "currentLocation": string|null, "mapPickup": string|null, "mapDestination": string|null, "mapCurrent": string|null, "placeNote": string}

Rules:
- Do not invent a fare, a pickup, a destination, or a current location. Use null when it was not said.
- farePkr is the offered fare in Pakistani rupees, digits only.
- pickup, destination, and currentLocation stay in the driver's words.
- mapPickup, mapDestination, and mapCurrent are the same places written as a Karachi map would name them, in English. Fix spelling. Example: "jail chorangi" becomes "Jail Chowrangi". "safari park" becomes "Safari Park". Do not switch to a different place.
- placeNote is 1 to 2 sentences in English about uncertainty, such as a neighbourhood that covers a wide area. Do not mention fuel, wear, money left over, or a verdict.

Offer:
${offerText}`;

  const text = await generate(apiKey, model, prompt, { json: true });
  const parsed = parseJsonObject(text);
  return {
    pickup: asText(parsed.pickup),
    destination: asText(parsed.destination),
    farePkr: asFare(parsed.farePkr),
    currentLocation: asText(parsed.currentLocation),
    mapPickup: asText(parsed.mapPickup),
    mapDestination: asText(parsed.mapDestination),
    mapCurrent: asText(parsed.mapCurrent),
    placeNote: asText(parsed.placeNote),
  };
}

export async function writeOfferNote(apiKey, model, facts) {
  const prompt = `Write a short English note for a Karachi ride-hailing driver.
Use only the facts below. Do not change any number. Do not add a fare, distance, or cost that is not listed.
Two to four sentences. Say Take, Thin, or Skip. Call the money left "you keep", never "net". Mention if a place is vague.
Thin means little or nothing is left, which can still be useful to reach a better spot.

Facts:
${JSON.stringify(facts)}`;

  return generate(apiKey, model, prompt);
}
