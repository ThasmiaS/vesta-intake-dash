# Vesta

Schema reference and intake funnel metrics from mock event data.

---

## Database schema

### `users`

| Column        | Description   |
| ------------- | ------------- |
| `id`          | User id       |
| `intake_type` | Intake flavor |
| `created_at`  | Created time  |

### `events`

| Column                | Description        |
| --------------------- | ------------------ |
| `id`                  | Event id           |
| `user_id`             | Foreign key        |
| `stage`               | Funnel stage       |
| `timestamp`           | Event time         |
| `time_spent_seconds`  | Time on that stage |

---

## Intake funnel (`data/mock_intake.csv`)

**Stages (order):** `visited` → `started` → `personal_info` → `document_upload` → `review` → `completed`

**How to read rates:** Step percentages are **conditional**—among users who reached the earlier stage, the share who also reached the next stage.

### Snapshot

| Metric                  | Value                          |
| ----------------------- | ------------------------------ |
| Users                   | 500 (ITIN 254 · Form 13614c 246) |
| Overall completion      | **18.0%** (90 completed)       |

### Step conversion (overall)

| From → to                         | Rate   |
| --------------------------------- | ------ |
| visited → started                 | 82.2%  |
| started → personal_info         | 83.9%  |
| personal_info → document_upload | 74.8%  |
| document_upload → review        | 64.7%  |
| review → completed              | 53.9%  |

### By intake type

| Metric (conditional)              | ITIN   | Form 13614c |
| --------------------------------- | ------ | ----------- |
| Completion (visited → completed) | 18.5%  | 17.5%       |
| visited → started                 | 83.9%  | 80.5%       |
| personal_info → document_upload | 77.6%  | 71.9%       |
| document_upload → review        | 67.4%  | 61.8%       |
| review → completed              | 51.6%  | 56.6%       |

### Key patterns (top 3)

1. **Post-upload → review is the steepest step**  
   Only **64.7%** of users who reach document upload also reach review—the largest conditional drop. Likely post-upload friction (success state, errors, or weak “what’s next”).

2. **Many users leave after review**  
   Of those who reach review, **53.9%** complete; the rest exit at the final step. Suggests last-step friction (surprise fields, consent, or submit clarity).

3. **Form 13614c vs ITIN**  
   13614c is weaker on **visited → started**, **personal_info → document_upload**, and **document_upload → review**, but overall completion is similar (~17.5% vs ~18.5%) because 13614c is slightly stronger on **review → completed**. Prioritize onboarding and document guidance for 13614c separately from ITIN.

### Median time on stage (seconds)

Medians are similar by type; review runs a bit lower for 13614c.

| Stage             | ITIN | Form 13614c |
| ----------------- | ---- | ----------- |
| visited           | 102  | 102         |
| started           | 106  | 112         |
| personal_info     | 106  | 106         |
| document_upload   | 113  | 101         |
| review            | 103  | 90          |
| completed         | 118  | 101         |

### Data quality

- **7** events with `time_spent_seconds === 0`
- **33** events with ≤ 3s (possible instrumentation noise or instant abandon)
