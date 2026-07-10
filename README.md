# Mega Backdoor Roth Paycheck Calculator

A single-file, static web app version of the old Google Sheets calculator. Enter the
YTD numbers from your latest paycheck, your salary, and your employer's match terms;
it computes the pre-tax/Roth and after-tax elections to set so you exactly hit the
IRS 402(g) and 415(c) limits by year-end.

Everything runs client-side - no backend; calculations happen in the browser and
inputs persist in `localStorage`.

## Features

- **Adjustable pay schedule**: bi-weekly (26/yr, anchored to any past pay date on any
  weekday), semi-monthly (24/yr, with configurable pay days, e.g. 15th + last day),
  or monthly (12/yr, on a configurable day of the month).
- **Current IRS limits** built in as presets (2025 and 2026), with editable fields for
  future years, including age-50+ catch-up and the SECURE 2.0 enhanced catch-up for
  ages 60–63 (correctly excluded from the 415(c) total).
- **All real-world match structures**, in plain language: single-tier % of pay
  ("50% up to 6%"), two-tier ("100% of your first 3%, then 50% of your next 2%" -
  Fidelity's most common), dollar-cap on contributions ("50¢ per $1 up to $12,250" -
  the Google/Meta/Microsoft style, timing-proof by design), or no match - each with
  a live "worth up to $X this year" line and the 401(a)(17) compensation cap applied.
  Plans that match after-tax contributions are supported too ("Which contributions
  get matched?"); since more match shrinks the 415(c) space that after-tax
  contributions draw from, the simulation iterates to the fixed point.
- **Match timing as a first-class question**: for %-of-pay formulas the tool asks
  whether missed match comes back to you (true-up), explains why in plain terms, and
  includes a "find out in 2 minutes" decoder - where to look in the SPD, what the
  key phrases mean, and a copy-paste question for HR. Unsure defaults to the safe
  even-spread strategy; timing-safe plans (true-up or dollar-cap) unlock a
  **front-loading strategy** - a dated, step-by-step election schedule that gets
  money invested months earlier, with any estimated year-end true-up called out.
- **Bonus-aware**: enter an expected bonus and its month; elections apply to bonus
  checks, so the per-paycheck simulation and the recommended percentages account for it.
- **Election rounding**: tell it whether your plan takes whole-percent, 0.5%, 0.1%, or
  exact-dollar elections; it rounds up for you and quantifies the overshoot, warning
  specifically about after-tax overshoot (plans don't always auto-stop at 415(c)).
- **A "path to the max" chart**: one column per remaining paycheck, stacked by
  pre-tax / match / after-tax, climbing to the IRS ceiling line - front-loading shows
  the steep-then-flat shape at a glance.
- Warnings for over-contribution, unachievable targets, and 27-paycheck years.

## Tests

A headless test suite drives the real `index.html` in [jsdom](https://github.com/jsdom/jsdom)
via Node's built-in test runner - no browser needed:

```sh
npm install
npm test
```

Tests run against a frozen "today" (`FIXED_TODAY` in `test/helpers.js`) so paycheck
counts are deterministic, and read results from the rendered "See the full math"
breakdown table - the same numbers a user sees. CI runs the suite on every push and
blocks the Cloudflare Pages deploy if it fails.

## Deploy to Cloudflare Pages

There's no build step - the whole app is `index.html`, plus a few static SEO
assets served alongside it (`robots.txt`, `sitemap.xml`, `favicon.svg`,
`favicon.ico`, `apple-touch-icon.png`, `og.png`).

**Option A - direct upload (fastest):**

```sh
npx wrangler pages deploy . --project-name mega-backdoor-roth
```

**Option B - dashboard:** Cloudflare dashboard → Workers & Pages → Create →
Pages → Upload assets → drag this folder in.

**Option C - git integration:** push this repo to GitHub, connect it in the Pages
dashboard, leave *Build command* empty and set *Build output directory* to `/`.

## Updating IRS limits for a new year

Edit the `PRESETS` object at the top of the `<script>` block in `index.html` and add
the new year (deferral limit, 415(c) limit, both catch-up amounts, compensation cap),
then add a matching button in the `#yearPresets` div. The IRS publishes the new
numbers each November (search "IRS COLA increases dollar limitations").
