# MedSuite — Frontend

React 19 single-page application for the MedSuite Hospital IPD Management System. Built with Vite, React Router, TanStack Query, and Recharts.

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

| Package | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI library |
| **Vite** | 7.3 | Build tool and dev server |
| **React Router DOM** | 7.13 | Client-side routing |
| **TanStack Query** | 5.90 | Server state, caching, and background refetching |
| **Axios** | 1.13 | HTTP client with interceptors |
| **Recharts** | 3.7 | Charting library for vital-sign graphs |
| **Lucide React** | 0.576 | SVG icon library |
| **ESLint** | 9.39 | Static code analysis |
| **@vitejs/plugin-react** | 5.1 | Fast Refresh and JSX transform |

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

| Tool | Minimum version |
|---|---|
| Node.js | 18 |
| npm | 9 |

### Install Dependencies

```bash
cd frontend
npm install
```

### Environment Variables

Vite exposes environment variables prefixed with `VITE_` to the browser.

Create a `.env` file in the `frontend/` directory if you need to override the default API URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The default base URL is `http://localhost:8000` (set in `src/api.js`). Update this for production or staging deployments.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server at `http://localhost:5173` with HMR |
| `npm run build` | Type-check and bundle for production into `dist/` |
| `npm run preview` | Serve the production build locally for pre-deploy testing |
| `npm run lint` | Run ESLint across all source files |

---

## Pages & Routing

All routes except `/login` are **protected** — unauthenticated users are redirected to `/login`.

| Path | Component | Description |
|---|---|---|
| `/login` | `Login` | Email/password form; stores JWT on success |
| `/` | `Dashboard` | Live summary — bed occupancy, active alerts, pending tasks |
| `/patients` | `Patients` | Searchable patient list; admit new patient modal |
| `/patients/:id` | `PatientDetail` | Full patient profile with tabs for vitals, audio notes, tasks, and alerts |
| `/beds` | `Beds` | Bed board grouped by ward; assign/release beds |
| `/tasks` | `Tasks` | Cross-patient task board; create and update status inline |
| `*` | Redirect | Falls back to `/` |

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

### Authentication (AuthContext)

`src/context/AuthContext.jsx` provides:

| Export | Type | Description |
|---|---|---|
| `AuthProvider` | Component | Wraps the app; persists token in `localStorage` |
| `useAuth()` | Hook | Returns `{ user, loading, login, logout }` |

- On mount the context reads the stored JWT, validates it against `/auth/me`, and sets `user`.
- `login(email, password)` calls `/auth/login`, stores the token, and updates state.
- `logout()` clears the token and resets state.
- The Axios instance in `api.js` automatically attaches `Authorization: Bearer <token>` to every request.

### Server State (TanStack Query)

All data-fetching is managed by **TanStack Query**:

```jsx
// Example — fetch patient list
const { data: patients, isLoading } = useQuery({
  queryKey: ["patients"],
  queryFn: () => api.get("/patients").then(r => r.data),
});

// Example — optimistic mutation
const admit = useMutation({
  mutationFn: (payload) => api.post("/patients", payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
});
```

The `QueryClient` is instantiated once in `App.jsx` and provided via `QueryClientProvider`.

---

## API Layer

`src/api.js` exports a pre-configured Axios instance:

```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

All page components and hooks import `api` directly — no per-component Axios configuration required.

---

## Component Overview

### `Navbar.jsx`

- Always visible when the user is authenticated.
- Displays the MedSuite logo, navigation links (Dashboard, Patients, Beds, Tasks), and the current user's name and role.
- Provides a **Logout** button that calls `useAuth().logout()`.

### `Login.jsx`

- Controlled form for email and password.
- Calls `login()` from `AuthContext` and navigates to `/` on success.
- Displays inline error messages on failure.

### `Dashboard.jsx`

- Aggregated KPI cards: total beds, available beds, active alerts, pending tasks.
- Quick links to key areas.

### `Patients.jsx`

- Paginated and searchable patient list.
- Inline "Admit Patient" modal with form validation.

### `PatientDetail.jsx`

- Tabbed view: **Overview** · **Vitals** · **Audio Notes** · **Tasks** · **Alerts**
- **Vitals** tab renders `LineChart` from Recharts for heart rate, SpO2, and temperature over time.
- **Audio Notes** tab supports recording audio directly in the browser and uploading to `/audio/{id}`.
- **Tasks** tab allows creating and progressing tasks inline.
- **Alerts** tab shows the severity-graded alert feed with acknowledge action.

### `Beds.jsx`

- Bed cards grouped by ward.
- Status badges: `available` (green) · `occupied` (blue) · `maintenance` (orange).
- Assign patient or release bed from each card.

### `Tasks.jsx`

- Cross-patient task board.
- Filter by status or assignee.
- Inline status transitions: `pending` → `in_progress` → `done`.

---

## Styling

The project uses **plain CSS** (`index.css` + `App.css`) without a CSS framework. Key conventions:

- CSS custom properties (variables) defined on `:root` for colour palette and spacing.
- Utility classes for layout (flex, grid) defined globally.
- Component-specific styles are co-located in the same CSS files or written as inline style objects for small overrides.

To integrate Tailwind CSS or a component library, install and configure it via `vite.config.js` in the standard way.

---

## Building for Production

```bash
npm run build
```

Output is placed in `frontend/dist/`. Deploy the contents of `dist/` to any static host (Nginx, Vercel, Netlify, S3+CloudFront, etc.).

**Nginx example** for React Router (client-side routing):

```nginx
server {
    listen 80;
    root /var/www/medsuite;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
    }
}
```

Make sure `VITE_API_BASE_URL` is set at build time to your production API URL:

```bash
VITE_API_BASE_URL=https://api.medsuite.example.com npm run build
```

---

## Linting

```bash
npm run lint
```

ESLint is configured in `eslint.config.js` using the flat config format with:

- `@eslint/js` recommended rules
- `eslint-plugin-react-hooks` for hooks linting
- `eslint-plugin-react-refresh` to enforce Fast Refresh constraints

---

## Development Notes

- **Hot Module Replacement (HMR)** is enabled by default via Vite — changes to `.jsx` / `.css` files are reflected instantly without a page reload.
- **React Query DevTools**: install `@tanstack/react-query-devtools` and add `<ReactQueryDevtools />` inside `QueryClientProvider` for development-time cache inspection.
- **Proxy** (optional): to avoid CORS during development, add a proxy in `vite.config.js`:

  ```js
  export default defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        "/auth": "http://localhost:8000",
        "/patients": "http://localhost:8000",
        // …
      },
    },
  });
  ```

- The JWT token is stored in `localStorage`. For higher security requirements, consider `HttpOnly` cookies and updating the `AuthContext` accordingly.
- `React.StrictMode` is enabled in `main.jsx` — effects run twice in development, which is expected.
