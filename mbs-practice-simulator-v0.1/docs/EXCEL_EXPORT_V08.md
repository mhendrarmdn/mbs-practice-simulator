# v0.8 Excel Workbook Export

Workbook Lab now supports browser-side Excel export.

## Output sheets

1. Summary
2. Round History
3. Strategy Alignment
4. Overall Business
5. Price
6. Marketing & R&D
7. Procurement
8. Production
9. Maintenance & Equipment
10. Dividend
11. R6 Plan

## R6 behavior

The R6 Plan worksheet contains decisions, review notes, and planning rationale.

It deliberately does not contain fabricated R6 revenue, sales, share, profit, cash, equity, or NPV results.

## Technology

The app uses the `xlsx` package (SheetJS) in the browser. Export does not require a server endpoint or new Supabase schema.
