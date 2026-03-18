# 🗂️ Product Manager — Desktop App

A cross-platform desktop application for managing products with image uploads, PDF export, and full CRUD operations. Built with **Tauri**, **React**, **TypeScript**, **Express**, and **SQLite**.

---

## 📸 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | [Tauri](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (via `sqlite3`) |
| PDF Export | Server-side PDF generation |

---

## ✨ Features

- 📦 Create, read, update, and delete products
- 🖼️ Image upload with drag-and-drop support
- 📄 PDF export per product
- 🔍 Full-text search across all product fields
- 📱 Responsive layout (mobile + desktop)
- 💾 Persistent local SQLite database

---

## 🗂️ Project Structure

```
product_manager/
├── src/                        # React frontend
│   ├── components/
│   │   ├── DeleteWarning.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── ImageUploadNew.tsx
│   │   ├── PdfDownloadButton.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── ProductForm.tsx
│   │   └── ProductList.tsx
│   ├── context/
│   │   └── DarkModeContext.tsx
│   ├── services/
│   │   └── api.ts              # Centralized API layer
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/                     # Express backend
│   ├── db.js                   # SQLite connection
│   ├── server.js               # API routes
│   └── products.db             # Auto-generated SQLite file
├── src-tauri/                  # Tauri (Rust) config
│   ├── src/
│   │   └── main.rs
│   └── tauri.conf.json
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [Rust](https://www.rust-lang.org/tools/install) (required by Tauri)
- [Tauri CLI prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) for your OS

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/product-manager.git
cd product-manager

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server
npm install
cd ..
```

### Running in Development

You need to run both the Express backend and the Tauri dev server simultaneously.

**Terminal 1 — Start the Express backend:**
```bash
cd server
node server.js
```
The backend runs on `http://localhost:5000`

**Terminal 2 — Start the Tauri dev app:**
```bash
npm run tauri dev
```

---

## 🗃️ Database

The app uses **SQLite** via the `sqlite3` Node.js package. The database file (`products.db`) is auto-created in the `server/` directory on first run.

### Schema

```sql
CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  description      TEXT,
  technical_details TEXT,   -- stored as JSON string
  image_path       TEXT,    -- relative path to uploaded image
  price            REAL
);
```

No manual database setup is required — the table is created automatically when the server starts.

---

## 📦 Building for Production

### 1. Build the frontend

```bash
npm run build
```

### 2. Package the Tauri desktop app

```bash
npm run tauri build
```

This generates a native installer for your platform:

| OS | Output |
|----|--------|
| Windows | `.msi` or `.exe` installer in `src-tauri/target/release/bundle/` |
| macOS | `.dmg` or `.app` in `src-tauri/target/release/bundle/` |
| Linux | `.AppImage` or `.deb` in `src-tauri/target/release/bundle/` |

> ⚠️ **Note:** The Express backend must be bundled or running separately. By default it runs as a local server on port `5000`. For a fully self-contained build, consider using [tauri-plugin-shell](https://github.com/tauri-apps/tauri-plugin-shell) to spawn the Node.js server as a sidecar process.

---

## 🌐 API Endpoints

The Express server exposes the following REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get all products |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/products` | Create new product |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Delete product |
| `POST` | `/api/upload-image` | Upload product image |
| `GET` | `/api/products/:id/pdf` | Download product PDF |

---

## 🧪 API Testing

All API endpoints were tested manually using **[Postman](https://www.postman.com/)** during development.

### Example Requests

**Get all products:**
```
GET http://localhost:5000/api/products
```

**Create a product:**
```
POST http://localhost:5000/api/products
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "technical_details": "{\"weight\": \"1kg\", \"color\": \"black\"}"
}
```

**Upload an image:**
```
POST http://localhost:5000/api/upload-image
Content-Type: multipart/form-data

Body: form-data → key: "image", value: <your image file>
```

**Download a PDF:**
```
GET http://localhost:5000/api/products/1/pdf
```

> 💡 To test the API yourself, import the requests above into Postman and make sure the Express server is running on port `5000` before sending any requests.

## 🔧 Environment & Configuration

The frontend API base URL is configured in `src/services/api.ts`:

```ts
const API_BASE_URL = "http://localhost:5000/api";
```

Change this if you deploy the backend to a different host or port.

---

## 📋 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run tauri dev` | Run full Tauri desktop app in dev mode |
| `npm run tauri build` | Package app as native desktop installer |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 🚀 Live Demo & Download

| Version | Link |
|---------|------|
| 🌐 Web App | [product-manager-o3uvti5hj-tidjani1bachirs-projects.vercel.app](https://product-manager-o3uvti5hj-tidjani1bachirs-projects.vercel.app) |
| 🖥️ Desktop App | [Download Installer](https://github.com/Tidjani1Bachir/product-manager/releases/tag/v2.0-desktop) |
