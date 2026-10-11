# v1.7.0 — Vision Intake + Official Financial Sync

## Objective

Turn MBS Arena into a safer competition-side decision cockpit:

**TopBoss official screen → assisted intake → human review → official round package → simulation → decision → TopBoss execution → actual-result reconciliation.**

## Screenshot workflow

1. Open **Status → Official Sync**.
2. Choose the target round.
3. Select 1–6 screenshots from TopBoss.
4. Click **Extract OCR Draft**.
5. Review OCR confidence and the extracted text buffer.
6. Check every populated number.
7. Captain explicitly confirms Environment / Actual / Financial Statement.

OCR never auto-commits.

## Source-of-truth order

The app should prefer data in this order:

1. Official confirmed TopBoss values.
2. Structured copied/exported TopBoss table or JSON.
3. Manual verified input.
4. OCR screenshot draft.
5. Practice simulation estimate.

## Detailed financial statement

v1.7 can store official Balance Sheet, Cash Flow, and Income Statement line items per round.

When an official detailed statement exists, the Financial Statement page uses it instead of the practice-model statement for that round.

## Multiplayer behavior

The screenshot image itself stays local to the browser. Only evidence metadata, OCR audit summary, and Captain-confirmed official values are written into the shared room state.

## Competition safety rule

A low-confidence OCR result is not a decision input until a human has checked it against the TopBoss screen.

The simulator intentionally prefers a 30-second verification step over a silent one-digit OCR error.
