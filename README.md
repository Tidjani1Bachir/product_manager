<div align="center">

# 📦 Product Manager

**A modern, full-stack inventory management application**
built for the web and desktop — fast, real-time, and production-ready.

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Turso](https://img.shields.io/badge/Turso-libSQL-4ff8d2?style=flat-square)](https://turso.tech)
[![Tauri](https://img.shields.io/badge/Tauri-Desktop-ffc131?style=flat-square&logo=tauri)](https://tauri.app)

</div>

<br/>
🌐 Live Demo → product-manager-chi-eosin.vercel.app
---
## 🐳 Docker (Local Development)

Run the entire stack locally with a single command — no Node.js installation required.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/product_manager.git
cd product_manager

# Copy and fill in your environment variables
cp server/.env.example server/.env

# Build and start all containers
docker compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost      |
| Backend  | http://localhost/api  |

### Container Architecture

| Container            | Image         | Role                              |
|----------------------|---------------|-----------------------------------|
| `product_manager_ui` | nginx:alpine  | Serves the React build + proxies API |
| `product_manager_api`| node:20-alpine| Express REST API on port 5000     |

### Common Commands

```bash
# Start (detached — terminal stays free)
docker compose up -d

# View logs
docker compose logs -f
docker compose logs -f backend    # backend only
docker compose logs -f frontend   # frontend only

# Check container status
docker compose ps

# Shell into backend container
docker compose exec backend sh

# Stop containers
docker compose down

# Full rebuild after code changes
docker compose down
docker compose build --no-cache
docker compose up
```

> **Note:** Docker is for local development only. Production runs on Vercel (frontend) and Vercel serverless (backend API).

---

## ✨ Overview

Product Manager is a full-featured inventory platform that combines a responsive React frontend with a Node/Express backend and a globally distributed Turso (libSQL) database. It supports real-time product and category management, dashboard analytics, a recycle-bin recovery system, PDF export, Cloudinary image uploads, and a polished light/dark theme — all optionally packageable as a native desktop app via Tauri.

---

## 🚀 Feature Highlights

### 🔄 Real-Time Product Management
Add, edit, duplicate, delete, and update stock — all changes are reflected instantly without a manual page refresh.

### ♻️ Recycle Bin & Recovery
- Soft-delete for both products and categories
- 30-day retention window with countdown display
- Restore a category and all of its linked products in one action
- Permanently delete when ready

### 📊 Dashboard Analytics
- Inventory snapshot: total value, average price, total units
- Stock status breakdown: in-stock / low-stock / out-of-stock
- Category breakdown filtered to active categories only
- Price range distribution chart
- 5 most recently added products
- Low-stock alert list

### 🎨 Theme Support
- Light and dark mode toggle
- Improved sidebar contrast and product-selection readability in dark mode

### 📄 Product Operations
- Edit technical details per product
- Download a formatted PDF per product
- Upload product images via Cloudinary

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand |
| **Backend** | Node.js, Express |
| **Database** | Turso / libSQL via `@libsql/client` |
| **Media** | Cloudinary + `multer-storage-cloudinary` |
| **PDF** | pdfmake |
| **Desktop** | Tauri |

---

## 📁 Project Structure

```
product_manager/
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── services/               # API service layer
│   ├── store/                  # Zustand stores
│   └── context/                # Legacy context (see Notes)
├── server/                     # Express backend
│   ├── routes/                 # API route handlers
│   ├── server.js               # App entry point
│   ├── db.js                   # libSQL client setup
│   └── cloudinary.js           # Cloudinary config
├── src-tauri/                  # Tauri desktop scaffold
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `server/` directory:

```env
# Database — Turso / libSQL
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token

# Media — Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
```

> **Optional** — Frontend API base URL (defaults to `http://localhost:5000/api` if omitted):
> ```env
> VITE_API_URL=http://localhost:5000/api
> ```

---

## 🧑‍💻 Local Development

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install
```

### 2. Start development servers

Open two terminals:

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
npm run dev
```

### 3. Open in browser

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |

---

## 📜 Available Scripts

### From the project root

| Script | Description |
|---|---|
| `npm run dev` | Start Vite frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:api` | Run backend API tests |
| `npm run tauri` | Run Tauri CLI command |

### From `server/`

| Script | Description |
|---|---|
| `npm run dev` | Start backend with nodemon (hot reload) |
| `npm run start` | Start backend with node |

---

## 🌐 API Reference

### Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List all active products |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/products` | Create product |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Soft-delete product |
| `PUT` | `/api/products/:id/stock` | Update stock level |
| `POST` | `/api/products/:id/duplicate` | Duplicate product |
| `GET` | `/api/products/:id/pdf` | Download product PDF |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | List all active categories |
| `GET` | `/api/categories/:id` | Get single category |
| `POST` | `/api/categories` | Create or restore category |
| `PUT` | `/api/categories/:id` | Update category |
| `DELETE` | `/api/categories/:id` | Soft-delete category + linked products |

### Recycle Bin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/recycle-bin` | List deleted products and categories |
| `POST` | `/api/recycle-bin/products/:id/restore` | Restore deleted product |
| `DELETE` | `/api/recycle-bin/products/:id/permanent` | Permanently delete product |
| `POST` | `/api/recycle-bin/categories/:id/restore` | Restore category + linked products |

### Dashboard & Uploads

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Fetch all dashboard KPIs |
| `POST` | `/api/upload-image` | Upload image to Cloudinary |

> 📖 Full SQL details for every endpoint are documented in [`docs/sql-catalog.md`](docs/sql-catalog.md).

---

## 📦 Build & Release

### Frontend production build

```bash
npm run build
```

### Desktop packaging (Tauri)

```bash
npm run tauri build
```

---

## 🏷️ Git Tag & Release Workflow

Follow this flow when publishing a new GitHub release.

#### Step 1 — Ensure a clean, up-to-date branch

```bash
git status
git pull origin main
```

#### Step 2 — Run quality checks

```bash
npm run lint
npm run test
npm run build
```

#### Step 3 — Choose a semantic version

| Change type | Example |
|---|---|
| Bug fixes only | `v2.2.1` |
| New backward-compatible features | `v2.3.0` |
| Breaking changes | `v3.0.0` |

#### Step 4 — Create an annotated tag

```bash
git tag -a v2.3.0 -m "v2.3.0: realtime dashboard, recycle-bin improvements, dark mode polish"
```

#### Step 5 — Push commits and tag

```bash
git push origin main
git push origin v2.3.0
```

#### Step 6 — Draft a GitHub release

1. Go to your repository → **Releases** → **Draft a new release**
2. Select tag: `v2.3.0`
3. Set title: `v2.3.0`
4. Add release notes (see template below)

---

## 📋 Release Notes Template

```
## v2.3.0

### Summary
- Dashboard category breakdown now reflects active categories in real time
- Recycle bin category/product behavior refined
- Dark mode and sidebar readability improvements
- Product list selected-row visibility improvements

### Backend
- Dashboard category filtering updated for deleted categories
- Recycle bin and category lifecycle behavior validated

### Frontend
- Real-time dashboard refresh hooks on category lifecycle events
- Theme toggle visual polish
- Dark-mode readability improvements in sidebar and product list

### Known Notes
- If theme styles appear stale in browser, hard refresh once (Ctrl+Shift+R).
```

---

## 🗒️ Notes

- **`DarkModeContext.tsx`** — Located at `src/context/DarkModeContext.tsx`. This is a legacy file and is **not** part of the active theme system. Theme state is managed through the Zustand theme store and the `ThemeToggle` component.
- **SQL Reference** — Every SQL statement used in this project is catalogued in [`docs/sql-catalog.md`](docs/sql-catalog.md), mapped to its endpoint and execution context.