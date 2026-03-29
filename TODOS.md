# TODOs

## Score Calculation Logic (pending)

The `score` field on each customer is currently always `null`.
Need to define:
- Which events increase score (purchase, referral, activity, etc.)
- How many points each event grants
- Whether score decays over time

Once rules are decided, update:
- `backend/processor.py` → `calculate_loyalty_level()` thresholds if needed
- Backend logic to populate `score` per customer

Loyalty level thresholds (current — in `processor.py`):
| Level     | Score range |
|-----------|-------------|
| Bronze    | 1 – 100     |
| Silver    | 101 – 300   |
| Gold      | 301 – 600   |
| Platinum  | 601 – 1000  |
| Diamond   | 1001+       |
