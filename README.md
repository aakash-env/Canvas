# Mini Design Canvas

A production-quality design canvas editor built with **Next.js 16**, **React 19**, **React Konva**, **Node.js/Express**, and **MongoDB**.

---

## Table of Contents

- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Setup & Run Steps](#setup--run-steps)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [MongoDB Setup](#mongodb-setup)
- [Deploying to Vercel (Frontend & Backend)](#deploying-to-vercel-frontend--backend)
- [API Endpoints Reference](#api-endpoints-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Bonus Features](#bonus-features)
- [Known Limitations](#known-limitations)

---

## Technologies Used

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Canvas Engine**: [React Konva](https://konvajs.org/docs/react/) (`react-konva` 19 + `konva` 10)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Typography**: [Inter](https://fonts.google.com/specimen/Inter) via `next/font/google`
- **Unique Identifiers**: [uuid v14](https://github.com/uuidjs/uuid)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES2022 + TypeScript)
- **Web Framework**: [Express 4](https://expressjs.com/)
- **Database & ODM**: [MongoDB](https://www.mongodb.com/) + [Mongoose 8](https://mongoosejs.com/)
- **Schema Validation**: [Zod 3](https://zod.dev/)
- **Security & Authentication**: [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (JWT Bearer tokens), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (salted password hashing)
- **CORS & Middleware**: `cors`, custom centralized error handling (`AppError`)

### Testing & Quality
- **Backend Test Suite**: [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) (29 tests)
- **In-Memory Database**: `mongodb-memory-server` for zero-dependency isolated unit/integration tests

---

## Prerequisites

- **Node.js**: Version 18.0 or higher (Node 20+ LTS recommended)
- **Package Manager**: `npm` (v9+), `yarn`, or `pnpm`
- **Database**:
  - Local MongoDB Community Edition (v6.0+) running on port `27017`, **or**
  - A cloud MongoDB Atlas connection URI (`mongodb+srv://...`)

---

## Project Structure

```
Canvas/
├── backend/                  # Express + TypeScript REST API
│   ├── src/
│   │   ├── __tests__/        # Jest + Supertest integration tests
│   │   ├── controllers/      # Route request & response handlers
│   │   ├── middleware/       # Auth guard (requireAuth), error handlers
│   │   ├── models/           # Mongoose schemas (Canvas, User)
│   │   ├── routes/           # Express routers (/api/auth, /api/canvases)
│   │   ├── services/         # Business logic & database operations
│   │   ├── types/            # Shared TypeScript type declarations
│   │   ├── validation/       # Zod validation schemas
│   │   ├── app.ts            # Express app factory with CORS & routing
│   │   ├── db.ts             # Mongoose connection with DNS SRV resolver
│   │   └── index.ts          # Server entrypoint
│   ├── .env.example          # Backend environment template
│   ├── jest.config.js        # Test runner configuration
│   └── package.json
│
├── frontend/                 # Next.js 16 + React Konva client
│   ├── app/                  # Next.js App Router (page.tsx, layout.tsx)
│   ├── components/
│   │   ├── auth/             # AuthModal (Sign In / Register tabbed modal)
│   │   ├── editor/           # Editor (root), CanvasStage (Konva), Toolbar,
│   │   │                     # PropertiesPanel, LayerPanel, TopBar, CanvasBrowser
│   │   └── ui/               # Reusable UI primitives
│   ├── context/              # AuthContext (JWT state, login, register, logout)
│   ├── hooks/                # useCanvasEditor (state, undo/redo, autosave, sync)
│   ├── lib/                  # api.ts (typed HTTP client), elements.ts (factories)
│   ├── types/                # canvas.ts (CanvasElement, User, AuthResult)
│   ├── env.example           # Frontend environment template
│   └── package.json
│
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port the Express server listens on |
| `MONGODB_URI` | `mongodb://localhost:27017/mini-design-canvas` | MongoDB connection string (Local or MongoDB Atlas) |
| `JWT_SECRET` | `super-secret-jwt-key-change-in-production` | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT token validity duration |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed frontend origins |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |

### Frontend (`frontend/.env.local`)

Copy `frontend/env.example` to `frontend/.env.local`:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL of the backend REST API |

---

## Setup & Run Steps

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create environment file
cp .env.example .env    # On Windows: copy .env.example .env

# Install dependencies
npm install

# Start in development mode (ts-node-dev with hot reloading)
npm run dev

# Or build and run for production
npm run build
npm start

# Run automated tests
npm test
npm run test:coverage
```

### 2. Frontend Setup

```bash
# In a separate terminal, navigate to frontend
cd frontend

# Create environment file
cp env.example .env.local    # On Windows: copy env.example .env.local

# Install dependencies
npm install

# Start in development mode (http://localhost:3000)
npm run dev

# Or build and run for production
npm run build
npm start
```

---

## MongoDB Setup

### Option A: Local MongoDB
1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the local MongoDB service (runs on `mongodb://localhost:27017`).
3. Set in `backend/.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/mini-design-canvas
   ```

### Option B: Cloud MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (or your current IP).
3. Under **Database Access**, create a user with read/write privileges.
4. Copy the connection string and set in `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@clusterproject.pghqmr8.mongodb.net/mini-design-canvas?retryWrites=true&w=majority
   ```
> **Windows DNS Note**: Node.js c-ares DNS resolver can encounter `querySrv ECONNREFUSED` on Windows when resolving `mongodb+srv://` hostnames. The backend automatically handles this in `backend/src/db.ts` by configuring reliable public DNS resolvers (`8.8.8.8`, `1.1.1.1`).

---

## Deploying to Vercel (Frontend & Backend)

Both the frontend and backend are configured for 1-click deployment on [Vercel](https://vercel.com). Deploy them as two projects linked to your repository.

### 1. Deploy the Backend (Express Serverless API)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
2. Import your GitHub repository (`Canvas`).
3. In the project setup settings:
   - **Project Name**: `canvas-backend-api` (or your preferred name).
   - **Framework Preset**: Select **Other**.
   - **Root Directory**: Click Edit and select `backend`.
4. Expand **Environment Variables** and add:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`).
   - `JWT_SECRET`: A secure random secret string (e.g. `openssl rand -base64 32`).
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGINS`: `*` (or your frontend Vercel domain once deployed).
   - `NODE_ENV`: `production`
5. Click **Deploy**. Vercel will build using `backend/vercel.json` and deploy your Express API as serverless functions with connection caching. Note your backend URL (e.g., `https://canvas-backend-api.vercel.app`).

### 2. Deploy the Frontend (Next.js App Router)

1. In your Vercel Dashboard, click **Add New... > Project**.
2. Import the same repository (`Canvas`).
3. In the project setup settings:
   - **Project Name**: `canvas-editor` (or your preferred name).
   - **Framework Preset**: **Next.js** (detected automatically).
   - **Root Directory**: Click Edit and select `frontend`.
4. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL`: The deployed backend URL from Step 1 (e.g., `https://canvas-backend-api.vercel.app`).
5. Click **Deploy**.

> **Note on CORS**: After both are deployed, you can update `CORS_ORIGINS` in your Backend Vercel project settings to match your exact Frontend Vercel URL (e.g., `https://canvas-editor.vercel.app`), then redeploy the backend for strict origin isolation.

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Creates a new user (`email`, `password`, `name`) | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | No | Validates credentials and returns JWT token | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Bearer | Returns the currently authenticated user profile | `200`, `401` |

### Canvas CRUD Endpoints (User-Scoped)

| Method | Endpoint | Auth | Request Body | Description | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/canvases` | Bearer | `{ name, artboard?, elements? }` | Create new canvas | `201`, `400`, `401` |
| `GET` | `/api/canvases` | Bearer | None | List user's canvases (sorted by `updatedAt` desc) | `200`, `401` |
| `GET` | `/api/canvases/:id` | Bearer | None | Fetch single canvas by ID | `200`, `400`, `401`, `404` |
| `PUT` | `/api/canvases/:id` | Bearer | `{ name?, artboard?, elements? }` | Update canvas name, artboard, or elements | `200`, `400`, `401`, `404` |
| `DELETE` | `/api/canvases/:id` | Bearer | None | Delete canvas by ID | `204`, `400`, `401`, `404` |
| `GET` | `/health` | No | None | Service health status | `200` |

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `V` | Switch to Select tool | Canvas / Global |
| `R` | Switch to Rectangle tool | Canvas / Global |
| `C` | Switch to Circle tool | Canvas / Global |
| `T` | Switch to Text tool | Canvas / Global |
| `Delete` / `Backspace` | Delete selected element (unless locked) | Canvas / Global |
| `Escape` | Deselect element & return to Select tool | Canvas / Global |
| `Ctrl+S` | Save canvas (prompts auth if guest) | Canvas / Global |
| `Ctrl+Z` | Undo last action | Canvas / Global |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo last undone action | Canvas / Global |

---

## Architecture & Design Decisions

### 1. Client-Side SSR Isolation for React Konva
HTML5 Canvas and Konva rely on native browser APIs (`window`, `document`, `HTMLCanvasElement`). In Next.js App Router, rendering Konva on the server produces hydration errors. To solve this, `CanvasStage` is loaded dynamically in `Editor.tsx` using `next/dynamic` with `{ ssr: false }`, guaranteeing clean client-side rendering.

### 2. Konva Scale Normalization
Konva Transformers apply transformations via `scaleX` and `scaleY`. If left unhandled, repeated transforms cause compounding scale distortion. After every transform interaction (`onTransformEnd`), `normalizeNode()` absorbs `scaleX`/`scaleY` into the element's intrinsic dimensions:
- **Rectangle**: `width = width * scaleX`, `height = height * scaleY`
- **Circle**: `radius = radius * ((scaleX + scaleY) / 2)`
- **Text**: `width = width * scaleX`, `fontSize = fontSize * scaleY`
Then `node.scaleX(1)` and `node.scaleY(1)` reset the node scale, ensuring crisp rendering and clean numeric values in the Properties Panel.

### 3. Immutable Snapshot Undo/Redo Engine
Instead of applying inverse delta patches, the history engine records complete immutable snapshots of the `elements` array (`historyPastRef` and `historyFutureRef` with 50-step capacity). This guarantees that complex actions—such as layer reordering, deletions, style changes, or bulk transforms—restore precisely without edge-case drift. Stacks are isolated per canvas instance to prevent cross-canvas contamination.

### 4. Debounced Autosave with Save-in-Flight Lock
Edits trigger a 1.5-second debounce timer that automatically updates the backend (`PUT /api/canvases/:id`). A `saveInFlight` ref prevents overlapping concurrent HTTP requests, and state is read synchronously via a ref snapshot to eliminate React state closure staleness.

### 5. Authentication & Strict User Data Isolation
- Passwords are encrypted using salted `bcryptjs` before storage.
- Every canvas document stores a reference to `userId`.
- All database queries filter strictly by `{ _id: id, userId }`. Users can never read, modify, or delete another user's canvases.
- Compound index `{ userId: 1, updatedAt: -1 }` guarantees fast queries for canvas lists.

### 6. Real-Time Page Refresh State Persistence
The active editor session (`elements`, `canvasName`, `artboard`, `canvasId`, `isDirty`) synchronizes to browser `localStorage` (`mini_canvas_current_session`). Upon browser refresh (F5 or reload), state restores immediately, protecting users from losing work before saving.

---

## Bonus Features

1. **Layer Management & Reordering**:
   - Depth controls: **Bring to Front**, **Send to Back**, **Step Up**, **Step Down**.
   - **Eye Visibility Toggle**: Hide/show elements on the canvas and in export without deleting.
   - **Lock Toggle**: Freeze elements to prevent accidental dragging, resizing, or deletion.
2. **Undo / Redo Engine**:
   - 50-step history with full state replacement.
   - Keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) and dynamic toolbar state.
3. **Debounced Autosave**:
   - Background persistence 1.5 seconds after editing stops.
   - Animated visual status indicator ("Saving...", "Saved", "Save failed").
4. **Authentication & User-Owned Canvases**:
   - JWT authentication with secure registration & login modal.
   - Registration flow automatically redirects to the Sign In tab with pre-filled credentials.
   - Strict database isolation ensuring user-private canvases.
5. **High-Resolution PNG Canvas Export**:
   - Single-click 2x Retina PNG export of exact artboard dimensions (`pixelRatio: 2`).
   - Transformer outlines are temporarily hidden during capture for clean artwork.
   - If an unauthenticated user clicks "Export PNG", the auth modal prompts for login/signup, and upon authenticating, the export automatically executes.
6. **Page Refresh Session Persistence**:
   - Real-time session synchronization prevents loss of work during accidental page reloads or tab closures.

---

## Known Limitations

- **Collaborative Multi-User Editing**: The canvas currently supports single-user editing per canvas. Real-time multi-cursor collaboration via WebSockets/CRDTs is not yet implemented.
- **Custom Vector Paths**: Supports Rectangle, Circle, and Text elements; freehand pen/pencil drawing and SVG import are not currently included.
- **Free Tier Atlas Latency**: Initial connection to free-tier MongoDB Atlas M0 clusters may take 1–2 seconds during cluster wake-up.
