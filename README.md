# RideWorth

A one-screen check for a Karachi app driver: paste or say a ride offer, then see whether the fare covers fuel, wear, and the time you would spend.

Gemma 4 reads the offer and writes the English note. Distance comes from OpenStreetMap. The money and the Take / Thin / Skip verdict are calculated in this app.

## Run

```
copy .env.example .env
```

Put a Google AI Studio key in `GEMINI_API_KEY`, then:

```
npm start
```

Open http://localhost:3000

```
npm test
```
