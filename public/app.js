const form = document.querySelector("#offer-form");
const offer = document.querySelector("#offer");
const vehicle = document.querySelector("#vehicle");
const checkButton = document.querySelector("#check");
const micButton = document.querySelector("#mic");
const status = document.querySelector("#status");
const result = document.querySelector("#result");

let map = null;
let checking = false;

const loadingSteps = [
  "Picking the offer apart",
  "Setting the places on a Karachi map",
  "Drawing the roads",
  "Working the petrol into the ride",
  "Folding in wear and tear",
  "Putting the verdict together",
];

let loadingTimer = null;

function showLoading(step) {
  status.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${escapeHtml(step)}`;
}

function startLoading() {
  let last = -1;
  const next = () => {
    let pick = Math.floor(Math.random() * loadingSteps.length);
    if (pick === last) pick = (pick + 1) % loadingSteps.length;
    last = pick;
    showLoading(loadingSteps[pick]);
  };
  next();
  loadingTimer = setInterval(next, 1600);
}

function stopLoading() {
  clearInterval(loadingTimer);
  loadingTimer = null;
  status.textContent = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value) {
  return `${Math.round(value)} PKR`;
}

function distance(km) {
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`;
}

function minutes(value) {
  return `${Math.round(value)} min`;
}

function verdictCopy(judged) {
  const keep = money(judged.netPkr);
  const bar = money(judged.minimumNetPkr);
  if (judged.verdict === "Take") {
    return `You keep ${keep}. For ${judged.minutes} minutes, that is enough.`;
  }
  if (judged.verdict === "Skip") {
    return `You lose ${keep.replace("-", "")}. Petrol costs more than they pay.`;
  }
  return `You keep ${keep}. For ${judged.minutes} minutes, worth it means about ${bar}. Little or nothing left can still be ok if you want that spot.`;
}

function scale(current) {
  const items = [
    ["Take", "worth your time"],
    ["Thin", "little left"],
    ["Skip", "you lose"],
  ];
  return `<ul class="scale">${items.map(([name, hint]) => {
    const on = name === current ? " on" : "";
    return `<li class="${name.toLowerCase()}${on}"><strong>${name}</strong> ${hint}</li>`;
  }).join("")}</ul>`;
}

function field(label, value, extra = "") {
  return `<div class="${extra}"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

function detailLine(label, said, mapped) {
  if (!said) return "";
  const different = mapped && mapped.toLowerCase() !== said.toLowerCase();
  const onMap = different ? `<br /><span>On the map: ${escapeHtml(mapped)}</span>` : "";
  return `<p><span>${escapeHtml(label)}</span> <strong>${escapeHtml(said)}</strong>${onMap}</p>`;
}

function drawMap(geometry) {
  const box = document.querySelector("#map");
  if (!box || !window.L || (!geometry.passenger && !geometry.deadhead)) {
    if (box) box.hidden = true;
    return;
  }
  box.hidden = false;
  if (map) {
    map.remove();
    map = null;
  }
  map = window.L.map(box, { scrollWheelZoom: false });
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  const layers = [];
  if (geometry.deadhead) {
    layers.push(window.L.geoJSON(geometry.deadhead, {
      style: { color: "#8a5a10", weight: 4, dashArray: "6 8" },
    }).addTo(map));
  }
  if (geometry.passenger) {
    layers.push(window.L.geoJSON(geometry.passenger, {
      style: { color: "#204e3a", weight: 5 },
    }).addTo(map));
  }
  const group = window.L.featureGroup(layers);
  map.fitBounds(group.getBounds(), { padding: [18, 18] });
}

function showGap(payload) {
  const understood = payload.understood;
  const heard = understood
    ? `<div class="places">
        <h3>Ride details</h3>
        ${detailLine("Pickup", understood.pickup, understood.mapPickup)}
        ${detailLine("Drop", understood.destination, understood.mapDestination)}
        <p><span>They pay</span> <strong>${understood.farePkr == null ? "not said" : escapeHtml(money(understood.farePkr))}</strong></p>
      </div>`
    : "";
  result.hidden = false;
  result.innerHTML = `<div class="gap"><h2>${escapeHtml(payload.title)}</h2><p>${escapeHtml(payload.message)}</p>${heard}${payload.sentToGemma ? "<p>The offer text was sent to Google so Gemma could read it.</p>" : ""}</div>`;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showResult(payload) {
  const judged = payload.judged;
  const toPickup = payload.deadhead
    ? `${distance(payload.deadhead.km)} · ${minutes(payload.deadhead.minutes)}`
    : "Not counted";
  const note = escapeHtml(payload.offerNote
    ? payload.offerNote
    : "The numbers above are for this ride. The short note could not be written this time.");
  const whereYouAre = payload.understood.currentLocation
    ? (payload.understood.currentLabel
      ? detailLine("You are at", payload.understood.currentLocation, payload.understood.mapCurrent)
      : `<p><span>You are at</span> <strong>${escapeHtml(payload.understood.currentLocation)}</strong><br />Could not find it on the map, so the ride to pickup is left out.</p>`)
    : "<p>You did not say where you are, so the ride to pickup is left out.</p>";

  result.hidden = false;
  result.innerHTML = `
    <div class="verdict ${judged.verdict.toLowerCase()}">
      <h2>Verdict: ${judged.verdict}</h2>
      <p>${verdictCopy(judged)}</p>
      ${scale(judged.verdict)}
    </div>
    <dl class="figures">
      ${field("The ride", `${distance(payload.passenger.km)} · ${minutes(payload.passenger.minutes)}`)}
      ${field("To the pickup", toPickup)}
      ${field("Petrol for this ride", money(judged.fuelCostPkr))}
      ${field("Wear and tear", money(judged.wearCostPkr))}
      ${field("They pay", money(payload.understood.farePkr))}
      ${field("You keep", money(judged.netPkr), "keep")}
    </dl>
    <div class="places">
      <h3>Ride details</h3>
      ${detailLine("Pickup", payload.understood.pickup, payload.understood.mapPickup)}
      ${detailLine("Drop", payload.understood.destination, payload.understood.mapDestination)}
      ${whereYouAre}
    </div>
    <div class="note">
      <h3>Why this verdict</h3>
      <p>${note}</p>
    </div>
    <div id="map"></div>
    <div class="assumptions">
      <h3>How this was worked out</h3>
      <ul>
        <li>Vehicle: ${escapeHtml(payload.vehicle.label)}. About ${payload.vehicle.kmPerLitre} km from each litre, a city average for this demo.</li>
        <li>Petrol price: ${Number(payload.fuelPricePerLitre).toFixed(2)} PKR per litre. Fixed for the demo, as if today's price had been fetched.</li>
        <li>Wear and tear: a small per-kilometre allowance. It is not a workshop bill.</li>
        <li>Worth your time: about 100 PKR kept for every 15 minutes on the road.</li>
        <li>Minutes are a road estimate. Live traffic is not included.</li>
      </ul>
    </div>
  `;
  drawMap(payload.map);
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runCheck(offerText) {
  checking = true;
  startLoading();
  checkButton.disabled = true;
  micButton.disabled = true;
  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerText,
        vehicle: vehicle.value,
      }),
    });
    const payload = await response.json();
    if (!payload.ok) showGap(payload);
    else showResult(payload);
    stopLoading();
  } catch (error) {
    showGap({ title: "The check did not finish", message: error.message, understood: null });
    stopLoading();
  } finally {
    checking = false;
    checkButton.disabled = false;
    micButton.disabled = !("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCheck(offer.value);
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  micButton.disabled = true;
  micButton.title = "This browser has no speech recognition. Paste the offer instead.";
} else {
  const recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const said = event.results[0][0].transcript;
    startLoading();
    runCheck(said);
  };
  recognition.onend = () => {
    if (!checking) micButton.disabled = false;
  };
  recognition.onerror = () => {
    status.textContent = "The mic did not catch that. Paste the offer instead.";
    micButton.disabled = false;
  };
  micButton.addEventListener("click", () => {
    status.textContent = "Listening…";
    micButton.disabled = true;
    recognition.start();
  });
}
