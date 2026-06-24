# Restaurant App — Waiter Ordering & Table Management

A tablet-first point-of-sale app for cafés and restaurants. Waiters take orders at the
table, items are tracked per table in real time across every device, and unprinted
items are sent to the kitchen/bar printers on demand.

Built with **Ionic + Angular** (standalone components) and packaged for **Android** with
**Capacitor**. Live state is kept in sync between devices over **Socket.IO**, backed by a
separate Node.js API.

## Features

- **Table-based ordering** — each table has its own running cart; add, edit, cancel, and
  remove items per table.
- **Custom tables** — create, rename, and delete ad-hoc tables on the fly (e.g. for the
  bar or takeaway), synced to all devices.
- **Real-time sync** — table and cart changes broadcast over Socket.IO with automatic
  reconnection, so every waiter device shows the same state instantly.
- **Move items between tables** — transfer a whole table or selected items to another
  table.
- **Print to kitchen/bar** — send only the unprinted items of a table to the printers,
  so re-printing never duplicates an order.
- **Rich menu** — categorized Greek menu (coffees, soft drinks, juices, beers, spirits &
  wine, cocktails, breakfast, burgers, pasta, salads, mains, and more) with per-item
  add-on materials (e.g. toast/crêpe toppings) and pricing.
- **Item customization** — choose add-ons and modifiers via a dedicated item-detail
  modal before adding to the cart.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | Angular 21 (standalone components, lazy-loaded routes) |
| Mobile UI kit | Ionic 8 |
| Native shell | Capacitor 8 (Android), full-screen / immersive mode |
| Real-time | Socket.IO client |
| HTTP | Angular `HttpClient` |
| Language | TypeScript |
| Backend | Node.js API (separate service — not in this repo) |

## Project Structure

```
src/app/
├── home/                 Home page
├── tab1/ , tab2/         Tab pages (Home / Tables)
├── tabs/                 Tab bar shell + routing
├── components/
│   ├── item-detail-modal/        Item customization & add-ons
│   ├── item-selection-modal/     Pick items from the menu
│   ├── select-table/             Table picker
│   └── table-management-modal/   Create / rename / delete tables
├── services/
│   ├── cart.service.ts           Cart CRUD, printing, move-items (REST)
│   └── table.service.ts          Custom tables + Socket.IO real-time sync
├── models/
│   └── categories.ts             Full menu definition (categories, items, add-ons)
└── interceptors/         HTTP interceptors
```

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- Ionic CLI — `npm install -g @ionic/cli`
- A running instance of the backend API (see [Backend](#backend))

### Install

```bash
npm install
```

### Configure the API endpoint

The app talks to the backend over both REST and Socket.IO. Set the API URL in the
environment files:

- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

```ts
export const environment: Environment = {
  production: false,
  apiUrl: 'http://<your-server-ip>:4300',
};
```

> Use the LAN IP of the machine running the backend so tablets on the same network can
> reach it.

### Run in the browser

```bash
npm start          # ng serve
```

Open http://localhost:4200.

## Building for Android

The project is configured for Capacitor with cleartext HTTP enabled (for LAN backends)
and full-screen immersive mode.

```bash
npm run build              # production web build into www/
npx cap sync android       # copy web assets + native plugins
npx cap open android       # open in Android Studio to build/run
```

## Backend

This repository contains **only the front-end app**. It expects a Node.js API exposing,
among others:

- `GET/POST/DELETE /cart/:tableId` — read, add to, and clear a table's cart
- `PUT/DELETE /cart/:tableId/item/:index` — edit or remove a single item
- `DELETE /cancel-item/:tableId/item/:index` — cancel an item
- `GET /cart` — all active carts + table metadata
- `POST /print-unprinted/:tableId` — print a table's unprinted items
- `POST /move-table-items`, `POST /move-table-items-selected` — move items between tables
- `GET/POST/PUT/DELETE /custom-tables` — manage custom tables
- Socket.IO events: `tables:sync`, `table:created`, `table:updated`, `table:deleted`,
  `carts:updated`

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the dev server (`ng serve`) |
| `npm run build` | Production build into `www/` |
| `npm run watch` | Development build in watch mode |
| `npm test` | Run unit tests (Karma + Jasmine) |
| `npm run lint` | Lint the project (ESLint) |
