# GadgetVault — Usability Test Results

**Status: not yet run.** This is the template the sessions get written up into,
kept alongside the plan so the format is agreed before anyone sits down — a
results format invented after the fact tends to be shaped around what happened
to be recorded.

Fill in §2 onwards from the observation sheets. Delete this paragraph and this
status line once the sessions are done.

---

## 1. What was run

| | |
|---|---|
| Dates | |
| Facilitator | |
| Build tested | branch `main`, commit `_______` |
| Participants | of 5 planned |
| Method | Moderated think-aloud, per [USABILITY_TEST_PLAN.md](./USABILITY_TEST_PLAN.md) |

## 2. Task success

| Task | Completed | With difficulty | Failed | Median time |
|------|-----------|-----------------|--------|-------------|
| 1. Find and buy a product | /5 | /5 | /5 | |
| 2. Check the order went through | /5 | /5 | /5 | |
| 3. Card declined | /5 | /5 | /5 | |
| 5. Admin: add a product | /5 | /5 | /5 | |
| 6. Admin: move an order along | /5 | /5 | /5 | |

## 3. Answers to the questions the study set out to ask

| # | Question | Answer |
|---|----------|--------|
| G1 | Can a first-time visitor buy something unaided? | |
| G2 | Is the simulated payment obvious? | |
| G3 | Is a decline understood? | |
| G4 | Can an admin add a product unaided? | |
| G5 | Where do people get lost? | |

## 4. Findings

One row per distinct problem. Merge duplicates across participants and note how
many people hit each — anything two or more people hit goes up a severity, per
the plan.

| # | Finding | Seen by | Severity | Evidence (quote) | Proposed fix | Status |
|---|---------|---------|----------|------------------|--------------|--------|
| U1 | | P_ | | "" | | ☐ open |
| U2 | | P_ | | "" | | ☐ open |
| U3 | | P_ | | "" | | ☐ open |
| U4 | | P_ | | "" | | ☐ open |
| U5 | | P_ | | "" | | ☐ open |

## 5. What worked

Worth recording as carefully as the problems — it is what stops a later
redesign quietly removing something that was already right.

-
-

## 6. What we changed as a result

| Finding | Change | Where | Covered by a test? |
|---------|--------|-------|--------------------|
| | | | |

A usability fix with no test against it is a fix that can be undone by the next
merge without anyone noticing. Where a finding leads to a code change, the
change gets a test in the automated suite and it is named here.

## 7. What we did not change, and why

Not every finding is worth acting on, but every one is worth answering.

| Finding | Decision | Reasoning |
|---------|----------|-----------|
| | | |

## 8. Threats to these results

Fill in honestly — this section is what separates a study from a demo.

- Participants were recruited from people the team knows, which biases towards
  people willing to be patient with student work.
- The facilitator built parts of the app, and cannot fully avoid steering.
- Five participants surfaces most problems but gives no reliable numbers; the
  percentages above describe these five people and nobody else.
- Sessions ran on a seeded database on a local machine, so nothing here says
  anything about behaviour under real load or latency.
