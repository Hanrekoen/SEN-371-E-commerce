# GadgetVault — Usability Test Plan

**Module:** SEN371 Software Engineering · Milestone 5 (Testing & Quality Assurance)
**Prepared by:** Hanre Koen (Person 2)
**Applies to:** GadgetVault web application, main branch

---

## 1. Why this exists

The automated suites answer "does it work". They cannot answer "can somebody
use it", because every one of them was written by the person who built the
thing, and that person already knows where the buttons are. Five people who
have never seen the app will find in twenty minutes what no amount of test
code would have found, because the failures they hit are not defects in the
code — they are places where the app makes sense to us and to nobody else.

## 2. What we want to learn

| # | Question | Why it matters |
|---|----------|----------------|
| G1 | Can a first-time visitor find a specific product and buy it without help? | This is the entire purpose of the site. |
| G2 | Is it clear at the payment screen that no real money is involved? | Everyone testing this is a real person with a real card reflex. If it is not obvious, we have built something alarming. |
| G3 | When a card is declined, do people understand what happened and what to do? | The declined path is the one a customer meets under stress. |
| G4 | Can an admin add a product without being told how? | The admin side has no onboarding at all. |
| G5 | Does anyone get lost, and if so, where? | Navigation problems show up as hesitation, not as complaints. |

## 3. Method

Moderated, think-aloud, in person or over a shared screen. The participant
does the task while saying what they are looking at and what they expect to
happen. The facilitator does not help.

- **Participants:** 5 (see §4). Nielsen's rule of thumb is that five people
  surface roughly 85% of usability problems; a sixth mostly re-finds the same
  ones.
- **Duration:** 20–25 minutes each.
- **Environment:** Chrome, desktop, 1440×900. One participant on a phone at
  390px width, because the layout is responsive and nobody has yet watched a
  person use it that way.
- **Data:** the facilitator's observation sheet, task success, time on task,
  and the participant's own words. No recording unless the participant agrees
  in writing (see the consent form).

### What counts as a failure

A task fails if the participant cannot complete it, completes it by accident,
or asks the facilitator for help. "Completed it eventually, visibly annoyed"
is a partial, and gets written down as such — those are the findings worth
having.

## 4. Participants

Five people who have not worked on GadgetVault. Target mix:

| P | Profile | Why this profile |
|---|---------|------------------|
| P1 | Buys online regularly | The expected user. Has strong expectations from other shops. |
| P2 | Rarely buys online | Will not fill gaps from experience elsewhere. |
| P3 | Fellow student, not on this project | Fast, impatient, will click before reading. |
| P4 | Someone over 45 | Different reading habits, different tolerance for small text. |
| P5 | On a phone | The responsive layout has only ever been tested by its author. |

Recorded in the results as P1–P5. No names in any written output.

## 5. Setup before each session

1. `cd server && npm run seed` — a known catalogue, and the seeded accounts.
2. `cd server && npm start`, then `cd client && npm run dev`.
3. A fresh browser profile or an incognito window, so no session carries over.
4. Have the participant sheet, the consent form and a blank observation sheet
   ready before the participant sits down.

## 6. Scripts

The facilitator script and the task list are in
[`USABILITY_TASK_SCRIPT.md`](./USABILITY_TASK_SCRIPT.md).
Consent: [`USABILITY_CONSENT.md`](./USABILITY_CONSENT.md).
Observation sheet: [`USABILITY_OBSERVATION_SHEET.md`](./USABILITY_OBSERVATION_SHEET.md).
Findings go in [`USABILITY_RESULTS.md`](./USABILITY_RESULTS.md).

## 7. How findings are rated

| Severity | Meaning | What happens |
|----------|---------|--------------|
| 1 — Critical | Stops someone completing a task, or risks real-world harm (e.g. believing a card was charged) | Fixed before the next milestone |
| 2 — Serious | Task completed, but with real difficulty or a wrong turn | Fixed if time allows, logged either way |
| 3 — Minor | Noticed and mentioned, no effect on the outcome | Logged |
| 4 — Cosmetic | Preference, not a problem | Logged, usually not acted on |

Anything two or more participants hit is raised one level regardless of how
small it looked the first time.

## 8. Ethics

Participation is voluntary, unpaid, and can be stopped at any moment without
giving a reason. Nothing personal is collected: no real names in the output,
no real email addresses (test accounts are created for them), and no real card
details are ever entered — the payment screen is a simulator and the test
cards are printed on the task sheet.

The one thing said out loud at the start of every session, because it is the
thing people worry about: **the participant is not being tested. The software
is.** If they cannot do something, that is a finding about the software.
