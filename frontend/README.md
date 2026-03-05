# MedSuite — Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-v5-FF4154)
![License](https://img.shields.io/badge/License-MIT-green)

React 19 single-page application for the MedSuite Hospital IPD Management System. Provides a role-aware, real-time clinical interface for admitting patients, monitoring vitals, managing beds, coordinating tasks, recording audio notes, and responding to alerts — all secured behind JWT-based authentication.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [Install Dependencies](#install-dependencies)
  - [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Pages & Routing](#pages--routing)
- [State Management](#state-management)
  - [Authentication (AuthContext)](#authentication-authcontext)
  - [Server State (TanStack Query)](#server-state-tanstack-query)
- [API Layer](#api-layer)
- [Component Overview](#component-overview)
- [Styling](#styling)
- [Building for Production](#building-for-production)
- [Linting](#linting)
- [Development Notes](#development-notes)

---

## Tech Stack

| Package              | Version | Role in the app                                                                              |
| -------------------- | ------- | -------------------------------------------------------------------------------------------- |
| **React**            | 19.2    | Declarative component UI with concurrent rendering                                           |
| **Vite**             | 7.3     | Native ESM dev server with instant HMR; optimised production bundler                         |
| **React Router DOM** | 7.13    | Client-side routing with `<Routes>`, `<Navigate>`, and nested layouts                        |
| **TanStack Query**   | 5.90    | Manages all server state: caching, deduplication, background refetch, and optimistic updates |
| **Axios**            | 1.13    | Promise-based HTTP client; Auth token injected globally via a request interceptor            |
| **Recharts**         | 3.7     | Composable SVG charts (LineChart) used on the vital-sign history tab                         |
| **Lucide React**     | 0.576   | Tree-shakeable SVG icon library used throughout the UI                                       |
| **ESLint**           | 9.39    | Enforces code quality with React Hooks and React Refresh plugin rules                        |

---

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── eslint.config.js        # ESLint flat config
├── package.json
├── public/                 # Static assets served as-is
└── src/
    ├── main.jsx            # React DOM render root
    ├── App.jsx             # Root component — providers, router, protected routes
    ├── App.css             # Global component-level styles
    ├── index.css           # CSS reset and base styles
    ├── api.js              # Axios instance (base URL, auth interceptor)
    ├── assets/             # Images, fonts, etc.
    ├── components/
    │   └── Navbar.jsx      # Top navigation bar (role-aware)
    ├── context/
    │   └── AuthContext.jsx # Auth state, login/logout helpers
    └── pages/
        ├── Login.jsx       # Login form
        ├── Dashboard.jsx   # Overview — beds, alerts, tasks
        ├── Patients.jsx    # Patient list and admit form
        ├── PatientDetail.jsx  # Patient profile, vitals chart, audio, tasks, alerts
        ├── Beds.jsx        # Bed board with ward filtering
        └── Tasks.jsx       # Task list, create and update task status
```

---

## Setup & Installation

### Prerequisites

| Tool    | Minimum version | Notes                                             |
| ------- | --------------- | ------------------------------------------------- |
| Node.js | 18              | LTS release recommended; download from nodejs.org |
| npm     | 9               | Bundled with Node.js                              |

### Install Dependencies

```bash
cd frontend
npm install
```

This installs all production and devDependencies from `package.json` into `node_modules/`.

### Environment Variables

Vite exposes variables prefixed with `VITE_` to client-side code via `import.meta.env`.

Create `frontend/.env` for local development:

```env
# Base URL of the FastAPI backend
VITE_API_BASE_URL=http://localhost:8000
```

Create `frontend/.env.production` for production builds:

```env
VITE_API_BASE_URL=https://api.yourhospital.com
```

**How it flows:** `VITE_API_BASE_URL` is read in `src/api.js` and used as the Axios `baseURL`. If the variable is not set, it falls back to `http://localhost:8000`.

> **Never put secrets in `.env` files** — all `VITE_` variables are inlined into the JavaScript bundle at build time and visible to anyone who downloads your app.

---

## Available Scripts

| Command           | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server at `http://localhost:5173` with HMR |
| `npm run build`   | Type-check and bundle for production into `dist/`             |
| `npm run preview` | Serve the production build locally for pre-deploy testing     |
| `npm run lint`    | Run ESLint across all source files                            |

---

## Pages & Routing

All routes except `/login` are **protected** — unauthenticated users are redirected to `/login`.

| Path            | Component       | Description                                                               |
| --------------- | --------------- | ------------------------------------------------------------------------- |
| `/login`        | `Login`         | Email/password form; stores JWT on success                                |
| `/`             | `Dashboard`     | Live summary — bed occupancy, active alerts, pending tasks                |
| `/patients`     | `Patients`      | Searchable patient list; admit new patient modal                          |
| `/patients/:id` | `PatientDetail` | Full patient profile with tabs for vitals, audio notes, tasks, and alerts |
| `/beds`         | `Beds`          | Bed board grouped by ward; assign/release beds                            |
| `/tasks`        | `Tasks`         | Cross-patient task board; create and update status inline                 |
| `*`             | Redirect        | Falls back to `/`                                                         |

Route protection is implemented via the `ProtectedRoute` wrapper in `App.jsx`:

```jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

---

## State Management

### Application State Overview

```
┌────────────────────────────────────────────────────────────────────┐
│ Global State (Context)                                         │
│   AuthContext — user identity, token, login/logout actions      │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Server State (TanStack Query)                                   │
│   Cached API responses — patients, beds, vitals, tasks, alerts  │
│   Automatic background refetch — stale data re-fetched silently │
│   Mutations invalidate related query caches on success          │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Local UI State (useState)                                       │
│   Modal open/close, form field values, active tab, filters      │
└────────────────────────────────────────────────────────────────────┘
```

### Authentication (AuthContext)

`src/context/AuthContext.jsx` manages all identity state for the app.

**What it exposes via `useAuth()`:**

| Property / Method        | Type           | Description                                                      |
| ------------------------ | -------------- | ---------------------------------------------------------------- |
| `user`                   | Object \| null | Current user object from `/auth/me` (null = not logged in)       |
| `loading`                | Boolean        | `true` while the stored token is being validated on mount        |
| `login(email, password)` | async function | POSTs credentials, stores token, sets `user`. Throws on failure. |
| `logout()`               | function       | Removes token from `localStorage`, sets `user = null`            |

**Startup flow:**

```
App mounts
  │
  ├─ Read token from localStorage
  │    ├─ No token → user = null, loading = false
  │    └─ Token found → GET /auth/me with token
  │         ├─ 200 OK → user = response data, loading = false
  │         └─ 401 / error → clear token, user = null, loading = false
  └─ Render routes (ProtectedRoute reads user + loading)
```

### Server State (TanStack Query)

Every API resource has a consistent query key convention:

| Resource           | Query key                             | Notes |
| ------------------ | ------------------------------------- | ----- |
| All patients       | `["patients"]`                        |       |
| Single patient     | `["patients", id]`                    |       |
| Beds               | `["beds"]`                            |       |
| Vitals for patient | `["vitals", patientId]`               |       |
| Audio notes        | `["audio", patientId]`                |       |
| Tasks              | `["tasks"]` or `["tasks", patientId]` |       |
| Alerts             | `["alerts", patientId]`               |       |

**Standard fetch pattern:**

```jsx
const { data, isLoading, isError, error } = useQuery({
  queryKey: ["patients"],
  queryFn: () => api.get("/patients").then((r) => r.data),
  staleTime: 30_000, // consider data fresh for 30 s
  retry: 2, // retry failed requests twice
});
```

**Standard mutation pattern:**

```jsx
const queryClient = useQueryClient();

const admitPatient = useMutation({
  mutationFn: (payload) => api.post("/patients", payload),
  onSuccess: () => {
    // Invalidate the patient list so it refetches with the new record
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    setModalOpen(false);
  },
  onError: (err) => {
    setError(err.response?.data?.detail ?? "Failed to admit patient");
  },
});
```

---

## API Layer

`src/api.js` exports a single pre-configured Axios instance used across the entire app:

```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

// ── Request interceptor ─────────────────────────────────────────────────────────
// Automatically attaches the JWT token to every outgoing request.
// Components never need to set headers manually.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor (recommended addition) ──────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — clear storage and reload to trigger AuthContext
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
```

**Usage in any component or hook:**

```jsx
import api from "../api";

// GET request
const { data } = await api.get("/patients");

// POST with JSON body
const { data: newPatient } = await api.post("/patients", { full_name: "...", ... });

// PATCH
await api.patch(`/tasks/${id}`, { status: "done" });

// File upload
const form = new FormData();
form.append("file", audioBlob, "recording.webm");
await api.post(`/audio/${patientId}`, form);
```

---

## Component Overview

### `Navbar.jsx`

Persistent top navigation bar, visible on every authenticated route.

- Renders the **MedSuite** logo/wordmark as a home link.
- Navigation links: **Dashboard**, **Patients**, **Beds**, **Tasks** — active link is visually highlighted using React Router's `NavLink`.
- Displays the current user's `full_name` and `role` badge (colour-coded by role).
- **Logout** button calls `useAuth().logout()` which clears the token and redirects to `/login`.
- Conditionally hidden on the `/login` page (`user` is null → `<Navbar>` is not rendered).

### `Login.jsx`

Public authentication form.

- Two controlled inputs: **Email** and **Password**.
- On submit calls `login(email, password)` from `AuthContext`.
- Shows a spinner during the async login request.
- Displays a red inline error message if credentials are wrong (`401`).
- Redirects to `/` on success via `useNavigate()`.

### `Dashboard.jsx`

Ward operations overview — the default landing page after login.

- **KPI cards:**
  - Total beds / available beds / occupied beds / maintenance beds
  - Active (unacknowledged) alerts count
  - Pending tasks count
- Quick-access buttons navigate to the relevant management pages.
- Data comes from `useQuery` calls to `/beds`, `/alerts`, and `/tasks`.

### `Patients.jsx`

Full patient list with search and admit workflow.

- Fetches `GET /patients` and renders a sortable card/table list.
- Debounced client-side search filters by patient name.
- **Admit Patient** button opens a modal form with fields:
  - Full name, age, gender, diagnosis, allergies, mental status, infection risk, severity flags.
- Submission calls `POST /patients` via `useMutation` and invalidates `["patients"]`.
- Each row links to `/patients/:id` for full detail.

### `PatientDetail.jsx`

The most feature-rich page — a tabbed patient profile.

| Tab             | API calls                           | Description                                                                                       |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Overview**    | Patient object                      | Demographics, diagnosis, allergies, bed assignment                                                |
| **Vitals**      | `GET /vitals/:id`                   | Recharts `<LineChart>` over all readings; "Simulate reading" button calls `POST /vitals/mock/:id` |
| **Audio Notes** | `GET /audio/:id`, `POST /audio/:id` | Lists transcripts; in-browser recorder using `MediaRecorder` API; uploads on stop                 |
| **Tasks**       | `GET /tasks?patient_id=:id`         | Inline task creation; status chips advance with a single click                                    |
| **Alerts**      | `GET /alerts?patient_id=:id`        | Colour-coded severity; acknowledge button calls `PATCH /alerts/:id`                               |

### `Beds.jsx`

Visual bed board for ward management.

- Fetches `GET /beds` and groups cards by `ward`.
- Status badges: `available` (green), `occupied` (blue), `maintenance` (amber).
- Each occupied bed card shows the admitted patient's name and links to their profile.
- **Assign** action opens a patient-picker dropdown and calls `POST /beds/:id/assign/:patient_id`.
- **Release** action calls `POST /beds/:id/release` and marks the bed available.
- Both mutations invalidate `["beds"]` and `["patients"]`.

### `Tasks.jsx`

Cross-patient task board for ward-level operational views.

- Fetches all tasks via `GET /tasks`.
- Filter bar: filter by `status` (pending / in_progress / done) and by assignee.
- Create task form: select patient, assignee, title, description.
- Status chips are clickable — each click advances to the next stage and calls `PATCH /tasks/:id`.
- Completed tasks can be hidden with a toggle.

---

## Styling

The project uses **vanilla CSS** without a UI framework or utility library. Conventions:

- `src/index.css` — global reset, CSS custom properties (variables), base typography.
- `src/App.css` — layout helpers, shared card and badge styles.
- Component-level styles are written as **inline `style` objects** for small, co-located overrides.

### CSS Custom Properties (design tokens)

```css
:root {
  --color-primary: #2563eb; /* brand blue */
  --color-danger: #dc2626; /* alert red */
  --color-warn: #d97706; /* warning amber */
  --color-success: #16a34a; /* available green */
  --color-bg: #f9fafb; /* page background */
  --color-surface: #ffffff; /* card background */
  --radius: 8px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### To add Tailwind CSS

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Add the plugin in `vite.config.js`:

```js
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Then import in `src/index.css`:

```css
@import "tailwindcss";
```

---

## Building for Production

```bash
npm run build
```

Vite bundles the app into `frontend/dist/`. The output is:

- **`dist/index.html`** — entry HTML with hashed script/style links
- **`dist/assets/`** — hashed JS and CSS chunks (safe to cache indefinitely)

### Preview the production build locally

```bash
npm run preview
# Opens at http://localhost:4173
```

### Deploy to a static host

**Nginx** (self-hosted — handles React Router's client-side routing):

```nginx
server {
    listen 80;
    server_name yourhospital.com;
    root /var/www/medsuite;
    index index.html;

    # Serve all routes from index.html so React Router handles navigation
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: proxy API calls through the same domain to avoid CORS
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache hashed assets indefinitely
    location /assets/ {
        expires max;
        add_header Cache-Control "public, immutable";
    }
}
```

**Vercel / Netlify**: Add a rewrite rule so all paths serve `index.html`.

- Vercel — create `vercel.json`:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- Netlify — create `public/_redirects`:
  ```
  /*  /index.html  200
  ```

**Build-time env var for the backend URL:**

```bash
# Set the production API URL at build time
VITE_API_BASE_URL=https://api.yourhospital.com npm run build
```

---

## Linting

```bash
npm run lint
```

ESLint is configured in `eslint.config.js` using the **flat config format** (ESLint 9+):

| Plugin                        | What it checks                                                               |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `@eslint/js` recommended      | Core JS rules — no unused vars, no undef, etc.                               |
| `eslint-plugin-react-hooks`   | Enforces Rules of Hooks and exhaustive deps in `useEffect`                   |
| `eslint-plugin-react-refresh` | Warns if a component file exports non-component values (breaks Fast Refresh) |

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

---

## Troubleshooting

### `Network Error` or `ERR_CONNECTION_REFUSED` in the browser console

- Ensure the FastAPI backend is running on port 8000.
- Confirm `VITE_API_BASE_URL` in `.env` is correct.

### Login submits but nothing happens / `422 Unprocessable Entity`

- The login endpoint expects `application/x-www-form-urlencoded`, not JSON. Axios should handle this automatically when you pass a `URLSearchParams` or `FormData` object. Check the `AuthContext` login implementation.

### Vitals chart shows no data

- A patient must have at least one vital reading. Click **Simulate Vitals** on the PatientDetail page to generate a mock reading.

### Audio recording not working

- The browser **must** be on `localhost` or `https://` for `MediaRecorder` to be allowed (browsers block mic access on plain HTTP in production).
- Grant microphone permission when the browser prompts.

### Hot Module Replacement (HMR) not updating

- HMR works with named or default exports of components. Anonymous default exports (e.g. `export default () => ...`) can break Fast Refresh. Name your components.

### `useEffect` runs twice in development

- This is expected behaviour in React 18+ Strict Mode. It will not happen in production builds.

---

## Development Notes

- **Fast Refresh (HMR)** — Vite + `@vitejs/plugin-react` gives instant updates without full page reloads. Works for both component code and CSS.
- **React Query DevTools** — add during development for cache inspection:
  ```bash
  npm install -D @tanstack/react-query-devtools
  ```
  ```jsx
  // In App.jsx, inside <QueryClientProvider>
  import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
  <ReactQueryDevtools initialIsOpen={false} />;
  ```
- **Dev proxy** — avoid CORS issues by proxying backend requests through Vite during development:
  ```js
  // vite.config.js
  export default defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        "/auth": { target: "http://localhost:8000", changeOrigin: true },
        "/patients": { target: "http://localhost:8000", changeOrigin: true },
        "/beds": { target: "http://localhost:8000", changeOrigin: true },
        "/vitals": { target: "http://localhost:8000", changeOrigin: true },
        "/audio": { target: "http://localhost:8000", changeOrigin: true },
        "/tasks": { target: "http://localhost:8000", changeOrigin: true },
        "/alerts": { target: "http://localhost:8000", changeOrigin: true },
      },
    },
  });
  ```
  With the proxy active, set `VITE_API_BASE_URL=''` (empty string) so all API calls go to the same origin.
- **JWT in localStorage** — convenient for SPAs but vulnerable to XSS. For hospital-grade security requirements, consider migrating to `HttpOnly` cookies with a CSRF token. Update `AuthContext` and the Axios interceptor accordingly.
- **`React.StrictMode`** is enabled in `main.jsx` — effects intentionally run twice in development to surface side-effect bugs. Disable it only as a last resort.
