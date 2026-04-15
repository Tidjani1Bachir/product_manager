# Product Manager

Product Manager is a web and desktop-ready inventory management app built with React, TypeScript, Vite, Express, and Turso (libSQL).

It includes real-time product/category updates, dashboard analytics, recycle-bin recovery flows, PDF export, image upload to Cloudinary, and a light/dark theme.

## Current Highlights

- Real-time product updates in the Products page
  - Add, edit, duplicate, delete, and stock updates are reflected without manual page refresh
- Recycle Bin workflows
  - Soft delete for products and categories
  - Product restore and permanent product delete
  - Category restore restores the category and related products
  - 30-day retention with countdown display
- Dashboard analytics
  - Stock status and inventory snapshot aligned with product quantity behavior
  - Category breakdown uses active categories only and updates after category lifecycle changes
- Theme support
  - Light and dark mode toggle
  - Improved contrast and readability in dark mode for sidebar and product selection states
- Product operations
  - Technical details editing
  - PDF download per product
  - Cloudinary-based image upload

## Tech Stack

- Frontend
  - React 19
  - TypeScript
  - Vite
  - Tailwind CSS v4
  - Zustand
- Backend
  - Node.js
  - Express
- Database
  - Turso / libSQL via @libsql/client
- Media
  - Cloudinary + multer-storage-cloudinary
- PDF
  - pdfmake
- Desktop
  - Tauri (project scaffold included)

## Project Structure

product_manager ORiginal/
- src/
  - components/
  - services/
  - store/
  - context/
- server/
  - routes/
  - server.js
  - db.js
  - cloudinary.js
- src-tauri/
- package.json
- vite.config.ts
- README.md

## Environment Variables

Create a server environment file at server/.env with values similar to:

TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000

Optional frontend variable (if needed):

VITE_API_URL=http://localhost:5000/api

If VITE_API_URL is not set, the app already falls back to http://localhost:5000/api.

## Local Development

Install dependencies:

1. Frontend
- npm install

2. Backend
- cd server
- npm install

Run in development (two terminals):

1. Backend
- cd server
- npm run dev

2. Frontend
- npm run dev

Default URLs:

- Frontend: http://localhost:5173 (or next available Vite port)
- Backend: http://localhost:5000

## Available Scripts

From the project root:

- npm run dev
  - Start Vite frontend
- npm run build
  - Build frontend
- npm run preview
  - Preview built frontend
- npm run lint
  - Run ESLint
- npm run test
  - Run Vitest
- npm run test:e2e
  - Run Playwright tests
- npm run test:api
  - Run backend API tests
- npm run tauri
  - Run Tauri CLI command

From server/:

- npm run dev
  - Start backend with nodemon
- npm run start
  - Start backend with node

## Core API Endpoints

Products

- GET /api/products
- GET /api/products/:id
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id
- PUT /api/products/:id/stock
- POST /api/products/:id/duplicate
- GET /api/products/:id/pdf

Categories

- GET /api/categories
- GET /api/categories/:id
- POST /api/categories
- PUT /api/categories/:id
- DELETE /api/categories/:id

Recycle Bin

- GET /api/recycle-bin
- POST /api/recycle-bin/products/:id/restore
- DELETE /api/recycle-bin/products/:id/permanent
- POST /api/recycle-bin/categories/:id/restore

Dashboard

- GET /api/dashboard/stats

Uploads

- POST /api/upload-image

## Build and Release

Frontend build:

- npm run build

Desktop packaging (if using Tauri):

- npm run tauri build

## Suggested Git Tag and Release Workflow

Use this flow when you want to publish a new GitHub release tag.

1. Ensure your branch is clean and up-to-date
- git status
- git pull origin main

2. Run quality checks before tagging
- npm run lint
- npm run test
- npm run build

3. Choose a semantic version tag
- Example: v2.3.0

Versioning suggestion:
- Patch: bug fixes only (v2.2.1)
- Minor: backward-compatible features (v2.3.0)
- Major: breaking changes (v3.0.0)

4. Create an annotated tag
- git tag -a v2.3.0 -m "v2.3.0: realtime dashboard, recycle-bin improvements, dark mode polish"

5. Push commits and tag
- git push origin main
- git push origin v2.3.0

6. Create GitHub release from the tag
- Open GitHub repository
- Releases -> Draft a new release
- Select tag: v2.3.0
- Title: v2.3.0
- Add release notes

## Recommended Release Notes Template

Title
- v2.3.0

Summary
- Dashboard category breakdown now reflects active categories in real time
- Recycle bin category/product behavior refined
- Dark mode and sidebar readability improvements
- Product list selected-row visibility improvements

Backend
- Dashboard category filtering updated for deleted categories
- Recycle bin and category lifecycle behavior validated

Frontend
- Real-time dashboard refresh hooks on category lifecycle events
- Theme toggle visual polish
- Dark-mode readability improvements in sidebar and product list

Known Notes
- If theme styles appear stale in browser, hard refresh once.

## Notes

- src/context/DarkModeContext.tsx is legacy and currently not used as the active theme system.
- Active theme state is managed through the Zustand theme store and ThemeToggle component.
- Full SQL reference is documented in docs/sql-catalog.md.
