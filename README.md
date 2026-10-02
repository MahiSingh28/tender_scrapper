# Tender Compiler

Live multi-state government tender compiler and Tender Intelligence dashboard.

## What this version does

- Starts with an **empty production database**. No seeded/demo tenders are inserted.
- Opens the **real government tender portal in a visible Chromium/Chrome browser**.
- Uses the real portal session and keeps it alive while the user completes the portal CAPTCHA.
- The user solves CAPTCHA themselves; the application does **not** read, OCR, guess, bypass, or automate the CAPTCHA.
- After the user clicks **Continue CAPTCHA & Extract**, the compiler submits the portal search and extracts the real tender rows returned by that session.
- Follows the returned session-bound tender links in the same browser context for detail enrichment.
- Saves real records to `data/tenders_db.json` with duplicate detection by tender ID.
- Provides Tender Intelligence using local deterministic rules, with no external generative-AI dependency.
- Provides keyword alerts, bookmarks, analytics, CSV and JSON export.

## Run

```bash
npm install
npx playwright install chromium
npm run dev
```

Open the local URL shown by the server, select the states, and click **Open Live CAPTCHA Session**.

A browser window will open on the real government portal. Solve the CAPTCHA in that browser. Do not try to bypass it and do not click the portal Search button yourself. Return to Tender Compiler and click **Continue CAPTCHA & Extract**.

For each selected state, the compiler opens a fresh portal session, waits for your manual CAPTCHA completion, extracts the real results, enriches the returned tender details, stores them, and then moves to the next selected state.

## Why the browser is visible

NIC GePNIC active-search pages require CAPTCHA and generate session-bound links. A server-side HTTP scraper cannot safely reuse a stale browser URL or invent a CAPTCHA answer. The visible browser keeps the real portal session, while the human handles the access-control step.

If a portal changes its page structure or requires an additional challenge on a particular detail/document page, the scraper reports that condition instead of inserting fake records.
