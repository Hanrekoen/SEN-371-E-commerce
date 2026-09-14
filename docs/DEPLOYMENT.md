# Deploying GadgetVault

Free, end to end, exactly as the application stands — simulated payment gateway
included.

| Piece | Host | Cost |
|---|---|---|
| Client (React/Vite) | GitHub Pages | free |
| API (Express) | Render web service | free tier |
| Database | MongoDB Atlas M0 | free tier (already in use) |
| Payment gateway | none — runs inside the API process | — |

Allow about 40 minutes the first time. Most of it is waiting for builds.

---

## Before you start

You need: a GitHub account with this repository pushed, the MongoDB Atlas
account you already use, and about two minutes of patience for Render's first
build.

**Two values get created along the way and pasted into the other service.**
They are the only fiddly part, so they are called out explicitly at each step:

- the **Render API URL**, which the client needs at build time
- the **GitHub Pages URL**, which the API needs for CORS

You will deploy the API first, then the client, then come back and tell the API
where the client ended up.

---

## Part 1 — The database

Atlas is already holding your data. Two settings need checking.

### 1.1 Allow Render to connect

Render's free tier has no fixed IP address, so there is nothing specific to
allow. Atlas must accept connections from anywhere.

1. Atlas → your project → **Network Access**
2. **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) → Confirm

> This is safe *only* because the database still requires the username and
> password in your connection string. It is the normal arrangement for
> platforms without static IPs. Never combine it with a weak database password.

### 1.2 Get the connection string

1. Atlas → **Database** → **Connect** → **Drivers**
2. Copy the string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
3. Put the database name in it, before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/gadgetvault?retryWrites=true&w=majority`

Without that database name Mongoose connects to `test`, and your seeded
catalogue is not there.

Keep this string to hand for step 2.3.

---

## Part 2 — The API on Render

### 2.1 Create the service

1. Sign in at **render.com** with GitHub (no card required)
2. **New +** → **Web Service**
3. Connect this repository
4. Fill in:

| Field | Value |
|---|---|
| Name | `gadgetvault-api` (becomes part of the URL) |
| Language | Node |
| Branch | `main` |
| **Root Directory** | **`server`** |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

> **Root Directory is the one people miss.** This repository holds both the
> client and the server. Leave it blank and Render builds the wrong thing.

### 2.2 Do not deploy yet

Scroll to **Environment Variables** and add them before the first build,
otherwise it starts, fails on missing configuration, and you wait through a
second build.

### 2.3 Environment variables

| Key | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Switches the refresh cookie to cross-site mode. Without it, sign-in silently fails once deployed. |
| `MONGODB_URI` | your Atlas string from 1.2 | |
| `JWT_ACCESS_SECRET` | a long random string | |
| `JWT_REFRESH_SECRET` | a **different** long random string | |
| `CLIENT_ORIGIN` | `https://YOURNAME.github.io` | Filled in properly at step 4.1 — put a placeholder for now |
| `TRUST_PROXY` | `true` | Render sits behind a proxy. Without this every visitor shares one rate-limit bucket, and express-rate-limit may refuse to start. |

For the two secrets, any long random text works. From a terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it twice and use a different output for each. They must not match.

Nothing about the payment gateway is needed. It defaults to the embedded mock,
which starts inside the same process on port 5001 and is reached over real HTTP
on localhost — so the integration stays genuine and still needs only one
service.

### 2.4 Deploy

Click **Deploy Web Service** and watch the log. When it settles on
`API listening`, open:

```
https://gadgetvault-api.onrender.com/api/health
```

You should get a JSON envelope with `"success": true`.

**Copy that base URL.** The client needs `https://gadgetvault-api.onrender.com/api`
— note the `/api` on the end — at step 3.2.

### 2.5 Seed the catalogue

The database is empty unless you have seeded it before. Render's free tier has
no shell, so run the seed from your own machine against the Atlas database:

```bash
cd server
MONGODB_URI="<your Atlas string>" npm run seed
```

On Windows in Git Bash the same line works. In PowerShell:

```powershell
$env:MONGODB_URI="<your Atlas string>"; npm run seed
```

This **wipes and rebuilds** the collections. If your Atlas database already
holds data you want, point this at a different database name first.

---

## Part 3 — The client on GitHub Pages

### 3.1 Turn Pages on

1. GitHub → this repository → **Settings** → **Pages**
2. **Source**: **GitHub Actions** (not "Deploy from a branch")

### 3.2 Tell the build where the API is

Vite inlines environment variables **at build time**, so this has to exist
before the build runs. Setting it later, or on Render, does nothing.

1. **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
2. **New repository variable**
3. Name: `VITE_API_BASE_URL`
4. Value: `https://gadgetvault-api.onrender.com/api`

A variable, not a secret — it is compiled into the bundle, which anyone can
read. Treating it as a secret would only hide it from you.

### 3.3 Deploy

Push to `main`, or **Actions** → **Deploy client to GitHub Pages** → **Run
workflow**.

The workflow builds the client, copies `index.html` to `404.html` so deep links
survive a refresh, and publishes. Your site lands at:

```
https://YOURNAME.github.io/REPO-NAME/
```

If `VITE_API_BASE_URL` is missing the build fails immediately with a message
saying so, rather than deploying a site that cannot reach anything.

---

## Part 4 — Introduce them

### 4.1 Point the API at the real client

Render → your service → **Environment** → edit `CLIENT_ORIGIN` to exactly:

```
https://YOURNAME.github.io
```

Origin only — no repository name, no trailing slash. `https://you.github.io/repo/`
is not an origin and CORS will reject every request.

Save. Render redeploys on its own.

### 4.2 Check it

Open your Pages URL and work through:

1. The catalogue loads with products — the client is reaching the API
2. Register an account — cross-site cookies are working
3. **Refresh the page.** Still signed in? The refresh cookie is good. Signed
   out? See troubleshooting.
4. Add something to the cart, check out with `4242 4242 4242 4242`
5. Refresh the receipt page — it should survive
6. Sign in as an admin and move the order along

---

## The cold start

Render's free tier suspends a service after 15 minutes without traffic. The
next request wakes it, which takes **30 to 60 seconds** — the site will appear
to hang.

**Before any demo, open the site a minute early** and let it wake up. It stays
warm while you are using it.

---

## Troubleshooting

**Signed out on every refresh.** `NODE_ENV` is not `production` on Render, so
the refresh cookie is still `sameSite: strict` and the browser is dropping it.
Check that variable, save, wait for the redeploy.

**CORS errors in the console.** `CLIENT_ORIGIN` does not match exactly. It must
be the scheme and host only: `https://you.github.io`, no path, no trailing
slash.

**Blank page, console full of 404s for `/assets/...`.** The base path is wrong.
The workflow sets it from the repository name automatically, so this usually
means the site is being served from somewhere other than `/REPO-NAME/`.

**A deep link 404s but the home page works.** The `404.html` copy did not make
it into the build. Check the "SPA fallback" step in the workflow run.

**The API log shows a MongoDB timeout.** Atlas Network Access does not include
`0.0.0.0/0`, or the password in the connection string contains characters that
need URL-encoding (`@` becomes `%40`, `#` becomes `%23`).

**Everything is slow on the first click.** That is the cold start, not a bug.

---

## What is deployed, honestly

Worth stating plainly if anyone asks:

- **The payment gateway is a simulator.** No money moves, no card is stored,
  and the payment screen says so on its face. It answers on the same test card
  numbers a real gateway would.
- **The database allows connections from any IP**, because the free tier has no
  static address to allow. Access still requires the credentials.
- **The refresh cookie is `sameSite: none`** so it works across two hosts. The
  reasoning, and what that gives up, is in `server/src/controllers/auth.controller.js`.
- **The free API tier sleeps.** This is a demonstration deployment, not a
  production one.
