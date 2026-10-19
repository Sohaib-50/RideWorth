## Initial Instructions

- must tend to  provide real utility by interpreting natural-language ride offers and explaining results, not merely wrapping a chatbot around a calculator.
- Implement fast. It's for a hackathon with 1-2 hours remaining in deadline.

### Product

RideWorth is an AI-powered ride profitability assistant for app-based drivers, focused on Karachi, Pakistan (eg. bykea, yango, etc). 

It helps drivers decide whether a ride offer is worth accepting by estimating fuel costs, road distance, travel time, and earnings after fuel considering mantainence estimates aand any other estimatestoo.

Target users include ride offerers/drivers using any vehicle including bike, rickshaw, and car drivers, including users who prefer speaking or describing an offer in plain language.

### Core User Flow

1. Driver describes an offer in plain English or Roman Urdu, or enters its details manually.
2. AI extracts structured fields: pickup, destination, offered fare, and any other supplied details. Ask for missing required information.
3. Geocode locations and calculate driving distance and estimated duration.
4. Calculate estimated fuel costs and earnings using explicit inputs.
5. Present a clear, understandable breakdown and decision guidance.

This is a proof of concept, not a production-ready dispatch or navigation system. Estimated times do not account for live traffic or blockades.

### POC Scope

Prioritize a functional end-to-end demo that can be built in 1–2 hours.

- City: Karachi, Pakistan.
- Routing: OSRM public demo API for road distance and estimated duration.
- Geocoding: Nominatim public API.
- Inputs: pickup, destination, fare, fuel price, vehicle fuel efficiency; driver's current location is optional but recommended.
- Calculate both the unpaid journey to pickup and the passenger journey  whenever the required locations are available.
- Output: route distance, estimated time, fuel cost, earnings after fuel,  and clearly stated assumptions. Good response UI not a text block llke chatbot response.
- Keep the interface simple, and easy to understand.



