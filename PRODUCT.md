# Product

## Register

product

The application is operational: a request flow, a quote, a tracking page and an operations dashboard. The one brand surface is the landing page at `/`, which has to earn a stranger's trust in about eight seconds. Treat `/` as brand, everything behind it as product.

## Users

**Primary: a customer in Zimbabwe buying for themselves.** They know exactly what they want, they have seen it on a UK site, and they cannot buy it locally or the local price is absurd. They are on a phone, often on expensive data, frequently at night. They have been burned before by someone who took their money and went quiet, or by a shipping charge that appeared after the goods had landed.

The job: *get this specific product, from that specific shop, to my hands in Harare, for a price I know before I pay.*

**Secondary: someone abroad buying on their behalf.** Usually family. They hold the card. The flow is identical; the recipient fields exist for them.

**Third: the administrator.** One or two people running the whole operation manually. They open every retailer link, confirm every price, place every order by hand. Their screens are dense on purpose.

## Product Purpose

Take a link to a UK product and turn it into a parcel in Zimbabwe, at a price agreed before any money moves.

The platform deliberately does not hold stock, maintain a catalogue, or promise a price it has not verified. A person confirms every price against the retailer before a quote is sent. The software's job is to make that manual process fast, traceable and legible to the customer.

Success looks like: a customer pastes a link, receives one confirmed total that includes shipping to Zimbabwe, pays once, and can see where their parcel is at any point without asking.

## Brand Personality

**Warm surface, precise bones.**

The voice is a person, not a platform: plain, direct, unembarrassed about money. The numbers underneath are exact and always shown in full. Warmth without rigour reads as a scam; rigour without warmth reads as a bank. This service needs both, because it is asking a stranger to pay in advance for goods they cannot see.

Three words: **direct, exact, unhurried.**

Never oversell. Never hide a number. When something is an estimate, say so and say what turns it into a real figure. The most trust-building thing this product does is tell you what it does not yet know.

## Anti-references

- **Generic SaaS landing page.** Gradient hero, three feature cards with icons, centred everything, purple-to-blue. Says nothing, could be any product.
- **Money-transfer apps** (WorldRemit, Sendwave, Remitly). Blue and green, flag icons, exchange-rate widgets. Being mistaken for a remittance service is an active commercial risk.
- **Cheap parcel and cargo forwarders.** Clipart aeroplanes, red and yellow, cluttered rate tables, three competing phone numbers. What most Zimbabwe shipping sites look like, and the thing customers are trying to escape.
- Luxury-fashion minimalism is not the target either: beautiful, cold, and it never says what the service actually does.

## Design Principles

1. **Show the number.** Prices, weights, fees and totals appear as early as they can be known, in full, with their workings. Never reveal a cost late.
2. **Name what is provisional.** Anything unconfirmed is labelled unconfirmed, with the step that will confirm it. Certainty is earned, not implied.
3. **The hero is the product.** The first thing on the page is the thing the product does: paste a link. Not a description of it.
4. **Two legs, two colours.** The UK leg and the Zimbabwe leg are visually distinct everywhere they appear, because the handover is the moment customers worry about.
5. **Warmth in words, precision in figures.** Prose is human and set in serif. Every number, reference and weight is monospaced. The typography carries the personality split.

## Accessibility & Inclusion

- WCAG 2.1 AA. Body text ≥4.5:1, large text ≥3:1, verified rather than assumed.
- Mobile-first in the real sense: the primary user is on a phone, on costly data. Nothing essential may depend on hover, and payload matters.
- Full `prefers-reduced-motion` alternatives on every animation.
- Colour is never the only carrier of state; the UK and Zimbabwe legs are also distinguished by label and position.
- Copy in plain English, no logistics jargon. "Handed to the cargo company", not "consignment tendered".
