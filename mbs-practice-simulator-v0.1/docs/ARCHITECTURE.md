# Architecture

## Core flow

```text
Decision Input
    ↓
Market & Economy Engine
    ↓
Product Quality / Image
    ↓
Competitive Attractiveness
    ↓
Potential Demand / Market Share
    ↓
Production + Inventory Constraints
    ↓
Actual Sales
    ↓
Cost & Financial Engine
    ↓
Profit / Cash / Equity / Ratios
    ↓
Practice NPV + Balanced Score
    ↓
Next Round
```

## Module responsibilities

### `config.js`
Static constants, baseline reference values, bot strategy list, and global game settings.

### `state.js`
Creates Round 0, AI baselines, history snapshots, localStorage persistence, and state helpers.

### `ai.js`
Generates decisions for nine competitor archetypes.

### `simulator.js`
Main model. It computes:

- economic environment
- surprise events
- quality and image effects
- market attractiveness
- demand and market share
- production capacity
- raw material conversion
- finished-goods constraints
- cost structure
- tax, cash, overdraft, equity
- ratios
- practice NPV
- balanced score

### `supabase.js`
Thin client for the three SQL RPC functions in `supabase/schema.sql`.

### `views.js`
HTML rendering only. No simulation logic should be added here.

### `app.js`
Application controller: navigation, UI events, state persistence, round submission, and online-room synchronization.

## State model

The browser stores one JSON state object:

```text
state
├── roomCode
├── roomKey
├── currentRound
├── surpriseMode
├── economy
├── draft
└── companies[]
    ├── user company
    └── 9 AI companies
```

Each company contains a `history[]` array, so Round N decision and Round N result remain aligned in the same history entry.

## Online room design

v0.1 deliberately uses a very small synchronization model:

```text
Browser A ─┐
Browser B ─┼─ RPC → mbs_rooms.state JSONB
Browser C ─┘
```

Clients poll approximately every 2.5 seconds. This is sufficient for a small practice team but is not designed for large-scale production multiplayer.

For v0.3+, replace whole-state polling with normalized tables, Supabase Auth, row-level membership, and Realtime subscriptions.

## Calibration boundary

Observed competition data is used as a calibration anchor, but formula ownership remains explicit:

- observed values = source calibration points
- simulator equations = independent training approximation
- proprietary TopBoss internals = unknown

This distinction should remain visible in future development and presentation materials.
