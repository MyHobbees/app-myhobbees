# Project Brief

## What it is

- MyHobbees sells themed craft subscription boxes (crochet, tricot, broderie, macramé) through a Shopify storefront, and keeps subscribers engaged between shipments with a companion mobile app of guided tutorials and gamification.

## Why it exists

- Pairs a physical subscription box with digital guidance and progression, so the box is not a one-off purchase but an ongoing learning experience the app rewards.

## Domain language

| Term | Meaning |
| ---- | ------- |
| Box | A themed craft kit shipped to a subscriber, with its own tutorials |
| Theme | A craft discipline grouping boxes/tutorials (crochet, tricot, broderie, macramé) |
| Tutorial | The guided steps bundled with a box; completing it awards XP |
| Badge | A gamification reward unlocked by a progress milestone |
| Abonnement | The subscription offer sold on the storefront (`box-creative`, `box-app`) |

## Key features

- Shopify storefront (`www-shop`) selling subscription offers and one-off products
- Mobile app (`www-app`) with tutorials, XP/streaks/badges, and a community discussion space
- Back-office (`www-back-office`) for staff to manage orders, products, customers, and Shopify connectivity
- Go API bridging the back-office/app to Shopify's Admin API and the Postgres database
