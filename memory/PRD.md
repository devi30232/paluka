# VaaniStock AI — PRD

## Original Problem
Voice-first multilingual (English / Telugu / Telugu+English) inventory assistant for Indian kirana shops. Speak commands like "Rice 5 bags add cheyyi" and see inventory update.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB), JWT auth, deterministic command parser
- Frontend: React + react-router-dom, custom CSS design system, Manrope/Outfit/Noto Sans Telugu fonts
- Database: MongoDB (users, shops, products, transactions)

## Users
- Kirana / small retail shop owners in India

## Core Requirements (static)
- Persistent inventory backed by MongoDB
- Voice-first UX with browser SpeechRecognition + fallback typing
- Multilingual UI (English, తెలుగు, Telugu+English)
- Voice parser: intent + product + quantity + unit
- Stock-in / stock-out with confirmation and negative-stock guard
- Alerts (low / out-of-stock / reorder suggestions)
- Transaction history
- Profile, Shop profile, Settings, Help pages
- Responsive (desktop sidebar + mobile bottom nav)

## What's been implemented (as of 2026-02)
- Full auth flow (email/password + Demo Shop one-click)
- Seeded demo shop with 7 products at realistic mix of stock levels
- Command parser with Telugu numerals (oka..padi) + unit normalization
- Voice + manual stock-in / stock-out via same backend service (`mutate`)
- Stock queries (CHECK_STOCK, LOW_STOCK_QUERY, REORDER_QUERY)
- Confirmation flow before mutating stock via voice
- Text-to-speech feedback (respects Voice Response setting)
- Full i18n across pages (English, Telugu unicode, Tenglish)
- Language, voice response, threshold settings persist to Mongo + reload correctly
- Reset Demo Data restores products/transactions without touching preferred language
- Mobile scrim + sidebar UX
- Title rebrand: "VaaniStock AI · Speak. Stock. Simplified."

## Known caveats
- Voice recognition uses `en-IN` — Telugu-in-Roman transcripts work; native Telugu script speech relies on browser mixed-lang support
- Help FAQ text remains English-only (small enhancement)
- There is no `/api/health` endpoint; runtime readiness was checked against existing authentication and inventory endpoints instead.
- The previous UI/parser rewrite still needs comprehensive frontend/backend regression validation; the readiness checks below are not a substitute.

## Deployment readiness check — 2026-09-19
- Latest user request: run the deployment agent and health check for readiness, before continuing feature work.
- Deployment analysis returned **PASS** with no blockers reported. No deployment was performed and no application code or configuration was changed.
- Live external checks passed: homepage HTTP 200, admin login HTTP 200, authenticated `/api/bootstrap` HTTP 200 (MongoDB-backed inventory), and logout HTTP 200. Temporary session files were removed and the test token revoked.
- Scope: deployment analysis and runtime API smoke checks only; no full browser regression, microphone-device validation, or production deployment verification was performed.
- Follow-up hardening: remove source-code credential/signing-secret fallback defaults and review production CORS restrictions. Configured environment values are used in the current environment; these defaults remain in the existing source.
- Requested native Telugu dictation, first-login feature tour, and weekly Shop Insights card remain pending; none were implemented during this readiness-only check.

## Backlog
- P0: Comprehensive frontend/backend regression validation of the previous App.js and parser rewrite; fix any findings and verify test-ID coverage.
- P1: Native Telugu speech recognition (`te-IN`) when Telugu is selected, with permission/unsupported-browser fallback.
- P1: Brief first-login onboarding tour highlighting microphone, alerts, and language options.
- P1: Home Shop Insights card with a weekly stock-in versus stock-out sparkline using actual transactions.
- P1: Extract affected pages/components from App.js before implementing new features.
- P1: Notification panel + read status
- P2: Broader component cleanup and dedicated readiness endpoint.
- P2: Category filter in Inventory
