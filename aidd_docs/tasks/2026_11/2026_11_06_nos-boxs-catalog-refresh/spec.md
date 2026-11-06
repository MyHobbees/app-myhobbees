# Nos boxs catalog refresh

## Target

Make "Nos boxs" show exactly three locally-defined box references (crochet, couture, peinture), independent of the live Shopify catalog, each with an original illustrated visual treatment, while keeping "Nos abonnements" as a separate, unchanged page.

## Hard constraints

- "Nos boxs" and "Nos abonnements" remain two distinct pages/routes; neither is merged into the other.
- Only crochet, couture, and peinture are shown as box references on "Nos boxs"; any other box reference is removed from that page.
- The page's content (which three boxes, their copy, their visuals) is defined locally in the codebase, not fetched from Shopify's product/collection catalog — the user confirmed this should be managed outside Shopify.
- Visuals are original illustrated/animated treatments authored for this delivery (SVG and/or CSS motion, in the same spirit as the site's existing hand-drawn wave patterns in `app.css`) — not real product photography, since none exists yet and none is being commissioned for this delivery.

## Non-goals

- No change to the subscription offers or copy on "Nos abonnements".
- No new box categories or products beyond crochet, couture, peinture.

## Done-when

- Loading "Nos boxs" shows exactly three entries — crochet, couture, peinture — each with its own original illustrated visual, with no call to Shopify's product/collection catalog on that page.
- "Nos abonnements" is unaffected and still reachable at its existing URL with its existing content.

## Stakeholders

- Decider: Dimitri (product owner)
- Owner: engineering team
- Consumer: visitors browsing the storefront pre-launch

## Context

- Confirmed by the user: no real photography or commissioned assets for this delivery; the visuals are to be created (illustrated/animated) as part of this work, and the page's box list no longer depends on Shopify.
