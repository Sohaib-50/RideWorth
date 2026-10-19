# RideWorth

The language of a Karachi driver's decision to accept or skip one ride offer.

## Language

**Driver**:
The person who would ride the offer and who pays, in fuel and time, if they accept it.
_Avoid_: User, rider, partner

**Ride offer**:
One proposed job: where to collect the passenger, where to take them, and what it pays.
_Avoid_: Trip, order, request

**Fare**:
The money the offer pays the driver.
_Avoid_: Price, payout, earnings

**Passenger leg**:
The drive from pickup to destination, with the passenger.
_Avoid_: Trip, route

**Deadhead**:
The unpaid drive from where the driver is now to the pickup.
_Avoid_: Pickup leg, empty run, approach

**Fuel cost**:
What the fuel for the counted distance is estimated to cost.
_Avoid_: Petrol, expense

**Wear**:
A per-kilometre allowance for maintenance, counted like fuel.
_Avoid_: Maintenance, depreciation

**Net**:
Fare minus fuel cost minus wear.
_Avoid_: Profit, earnings, margin

**Take**:
The verdict when Net meets the time-based minimum for the time the driver would spend.
_Avoid_: Accept, worth it, yes

**Thin**:
The verdict when Net is zero or positive, and below the time-based minimum. A zero Net can still be worth riding, for example to relocate.
_Avoid_: Maybe, borderline

**Skip**:
The verdict when Net is negative. The driver would lose money.
_Avoid_: Reject, no, loss

**Offer note**:
An English explanation of this verdict and of anything uncertain in the places or the assumptions. It is written for this offer, not from a fixed script.
_Avoid_: Summary, chatbot reply, advice
