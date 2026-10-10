# Changelog

## v1.2.6 — Chart Readability & Financial Insight

### Navigation / round state
- Switching to a different parity page now resets its round selector to the latest completed result instead of carrying an old R0 selection across pages.

### Chart readability
- Adds more left plot padding so data labels do not collide with Y-axis labels.
- Revenue and Net Profit axes use compact labels such as $3M, $2M, $500k, and -$250k while point labels keep exact values.
- Sales Trend uses compact volume ticks such as 1M, 750k, and 250k.
- First and last point labels receive horizontal offsets so they do not sit directly on the chart boundary.
- Single-series no-legend charts use more vertical plot area.

### Ranking semantics
- Dashboard rank colors now use three tiers:
  - top 30%: green,
  - middle: amber,
  - bottom 20%: red.
- For 10 companies this means ranks 1–3 green, 4–7 amber, and 8–10 red.

### Product Image
- Renames the point-matching column from # to No. so it is not confused with competitive rank.
- Company names are left aligned.
- MARKOWITZ uses a row highlight instead of the floating bullet treatment.
- Lower quadrant labels are moved inward to avoid overlap with competitor points.
- Market-average labels are slightly smaller and less dominant.
- Native point tooltips remain available for every company.

### Revenue Status
- Company names are left aligned while numeric columns remain right aligned.
- MARKOWITZ row receives a subtle highlight.
- Revenue ranking remains sorted from highest to lowest.

### Automatic financial debrief
- Dashboard and Revenue Status compare the selected round with the previous completed round.
- The debrief reports revenue change, net-profit swing, and implied total-cost change (Revenue minus Net Profit).
- The wording intentionally describes implied total cost and does not claim unsupported fixed-cost decomposition.

### Layout / sidebar
- Dashboard panels in the same row stretch to equal height.
- Adds a subtle lower-edge cue to the scrollable sidebar navigation.

### Database
- No Supabase schema migration required.

## v1.2.5 — Chart Trust & Automatic Debrief

Negative-money formatting, rounded chart axes, break-even semantics, Sales Trend debrief, enriched Product Image, revenue rank, and sidebar completion.

## v1.2.4 — Chart, Form & Sidebar Reliability

Sidebar scroll preservation, Product Image scaling, decision input formatting, and trend-chart cleanup.
