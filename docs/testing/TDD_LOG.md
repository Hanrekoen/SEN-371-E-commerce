# Test-Driven Development — Worked Log

**Module:** SEN371 · Milestone 5
**Author:** Hanre Koen (Person 2)

Most of this project's tests were written after the code they cover, and this
document does not pretend otherwise. One feature was built strictly test-first,
start to finish, and this is the record of it: what was written, in what order,
and what the terminal actually said at each step.

**Feature:** Category management for admins — `/admin/categories`.

---

## Why this feature

It was chosen because it was genuinely missing, not because it was convenient
to demonstrate on.

Every product needs a category, and the product form's category picker is a
required field. The API had category endpoints, but the app had no screen that
called them. So an admin starting from an empty database could not add a single
product — the capability existed, and nothing in the interface ever asked for
it. That is a real gap, small enough to build in one sitting, and with enough
behaviour in it (a list, a create, a delete, and four different failures) to be
worth driving from tests.

---

## Step 1 — RED: write the test for a file that does not exist

`src/pages/AdminCategoriesPage.test.jsx` was written first. Twelve tests,
describing the screen entirely in terms of what an admin would see and do:

- the categories are listed, with the slug the URL will use
- an empty list says so, and says products cannot be added until one exists
- a failed load is reported rather than showing an empty list
- creating sends the name that was typed
- the list refreshes after a create
- an empty name is not sent at all
- a duplicate name surfaces the API's 409 message
- the field is cleared on success
- **the field is kept on failure**
- deleting asks for confirmation first
- deleting calls the API with the category's id
- a 422 saying products are still attached is surfaced in the API's own words

No implementation file existed at this point.

```
$ npx vitest run src/pages/AdminCategoriesPage.test.jsx

 FAIL  src/pages/AdminCategoriesPage.test.jsx
Error: Failed to resolve import "./AdminCategoriesPage" from
       "src/pages/AdminCategoriesPage.test.jsx". Does the file exist?
  Plugin: vite:import-analysis
  File: /tmp/merged/client/src/pages/AdminCategoriesPage.test.jsx:12:38

 Test Files  1 failed (1)
      Tests  no tests
```

This is the correct first failure. It fails for the only honest reason a test
can fail before any code is written — there is nothing to import. A test that
passes at this point is testing nothing.

### The one that shaped the design

`the field is kept on failure` was written before any code decided what to do
with the input. Writing it is what forced the decision: clearing the name field
on *every* attempt would make someone retype a name because the server was
briefly down, which is a small insult on top of the failure. The implementation
clears on success only, and it does so because a test said to — not because
anyone remembered to think about it afterwards.

`an empty name is not sent at all` came from the same place. A round trip to be
told what the browser already knew is a wasted second of someone's time.

---

## Step 2 — GREEN: write only enough to satisfy the tests

`src/pages/AdminCategoriesPage.jsx` was written against that list, plus three
supporting changes the tests required:

| File | Change |
|------|--------|
| `src/pages/AdminCategoriesPage.jsx` | new — the screen |
| `src/api/categories.api.js` | added `createCategory`, `updateCategory`, `deleteCategory` |
| `src/App.jsx` | route `admin/categories`, behind `RequireAuth role="admin"` |
| `src/components/layout/Navbar.jsx` | "Categories" in the admin links |

```
$ npx vitest run src/pages/AdminCategoriesPage.test.jsx

 ✓ src/pages/AdminCategoriesPage.test.jsx (12 tests) 598ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Nothing was added that no test asked for. There is no editing, no reordering
and no icon picker on that screen, because nothing needed them yet.

---

## Step 3 — REFACTOR: with the tests holding the behaviour still

Two changes after green, both with the suite re-run after each:

1. **The empty-category hint on the product form.** `AdminProductsPage` now
   says, when no categories exist, that one has to be added first, and links to
   the new page. Found while writing the empty-state test above: the test said
   the categories page explains the dependency, and it was obvious the product
   page — where someone actually meets the problem — said nothing.

2. **Error handling moved onto the shared `summaryMessage` helper**, so a
   failure here reads the same as a failure anywhere else in the app. The tests
   assert on the *message the API sent*, not on wording this page invents, so
   this refactor changed the implementation without touching a single test.

That second point is the argument for TDD in one line: the tests were written
against behaviour, so they survived a rewrite of the thing that produces it.

---

## What this actually cost, honestly

Writing the tests first took longer than writing the page would have. The
payoff was not speed:

- **Two design decisions were made deliberately** (keeping the field on
  failure, not sending an empty name) that would otherwise have been made by
  accident, or not at all.
- **The empty state was built first, not last.** Working test-first means the
  empty list is the first thing on screen, so it got designed instead of being
  whatever is left when there is no data.
- **The failure paths are covered as well as the success path**, because there
  was no working screen tempting anyone to call it done.

Against that: writing tests for a screen that does not exist means guessing at
labels and roles, and two tests had to be adjusted once the markup existed
(`getByLabelText(/^name/i)` needed anchoring, and a status query needed a role
rather than text). Adjusting a test to match the real accessible name is not
cheating; changing an assertion about *behaviour* to match what the code
happens to do would be, and that did not happen here.

---

## Where else the cycle was used

The full ceremony was used once. The same discipline — write the failing test
first, then the fix — was used on every defect found during this milestone,
which is TDD applied to bugs:

| Defect | Test written first | Fix |
|--------|--------------------|-----|
| `ProductDetail` reported a 503 as "Product not found" | `a server failure is reported separately from a missing product` | `missing = error ? error.status === 404 : true` |
| `SecurePayOverlay` logged an unhandled rejection on a fast decline | the decline tests in `SecurePayOverlay.test.jsx` | attach `pending.catch(() => {})` before the pacing waits |
| The login rate limiter never skipped in tests and used its own envelope | `auth.lifecycle.test.js` tripped a 429 after ten sign-ins | share `reject()` and `skipInTests()` from `middleware/rateLimit` |

In each case the test failed first, for the right reason, and the fix is what
turned it green. The full list of defects the suites caught is in
[`TEST_REPORT.md`](./TEST_REPORT.md) §7.
