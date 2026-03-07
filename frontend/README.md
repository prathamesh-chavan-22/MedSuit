# MedSuite Frontend

React frontend for MedSuite with protected workflows and session-aware authentication.

## Implemented Frontend Areas

- Login and route protection
- Token + refresh-token lifecycle handling in `AuthContext` and `api.js`
- Patients list and expanded patient intake form
- Patient detail tabs for overview, notes, labs, and timeline
- Dashboard, beds, tasks, and alert websocket interactions

## Key Files

- `src/api.js`: auth header interceptor + one-time refresh retry logic
- `src/context/AuthContext.jsx`: login, bootstrap auth state, async logout
- `src/pages/Patients.jsx`: edge-case patient intake UI
- `src/pages/PatientDetail.jsx`: clinical patient detail surface
- `src/components/Navbar.jsx`: nav, alert handling, logout trigger

## Environment

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## Run and Build

Dev:

```powershell
cd frontend
npm install
npm run dev
```

Build:

```powershell
cd frontend
npm run build
```

## Session Behavior

- App loads with stored access token and calls `/auth/me`
- `401` responses trigger one refresh attempt via `/auth/refresh`
- Refresh success retries the original request
- Refresh failure clears local auth state and redirects to login
