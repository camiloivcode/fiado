# Separación frontend/backend + dashboard administrativo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la v1 (6 archivos estáticos con `localStorage`) por un sistema con backend Express+SQLite (API REST) y frontend React+Vite (dashboard administrativo responsive), ambos dockerizados.

**Architecture:** Monorepo con `backend/` (Express, `node:sqlite` nativo — sin dependencia externa ni compilación, API REST sin estado en memoria) y `frontend/` (React + Vite + React Router, consume la API por `fetch`). `logic.js` (aritmética de saldos) se porta del v1 al backend sin cambios de comportamiento. Docker Compose levanta ambos servicios; en desarrollo corren sueltos con `npm run dev`/`node server.js`.

**Tech Stack:** Node 20+ (usa el módulo nativo `node:sqlite`, sin dependencia externa de SQLite), Express 4, React 18, Vite 5, React Router 6, Docker, nginx (para servir el build de producción del frontend).

**Spec:** `docs/superpowers/specs/2026-08-31-frontend-backend-split-design.md`

## Global Constraints

- Backend corre en un solo dispositivo/servidor — SQLite, no Postgres.
- Sin login/autenticación en este alcance.
- Montos siempre enteros positivos (pesos, sin decimales).
- El saldo de un cliente nunca se guarda: se calcula `Σ fiados − Σ abonos` en cada consulta.
- Sin librería de estado global (Redux/Zustand) — `fetch` + estado local de React alcanza.
- Sin infraestructura de testing de componentes React (Vitest/RTL) — verificación manual de UI.
- URL del backend configurable por variable de entorno (`VITE_API_URL`), nunca hardcodeada.
- APK/Capacitor está fuera de alcance de este plan (fase 2).

---

## File Structure

```
DEMO/
├── backend/
│   ├── package.json
│   ├── db.js                 SQLite: esquema + consultas preparadas + helpers
│   ├── logic.js              aritmética pura (portada de v1, sin cambios de comportamiento)
│   ├── server.js             Express app (crearApp) + montaje de routers + 404/500
│   ├── routes/
│   │   ├── clientes.js
│   │   ├── movimientos.js
│   │   ├── caja.js
│   │   ├── resumen.js
│   │   └── reportes.js
│   ├── test.js                Node assert: logic.js + db.js + endpoints HTTP
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js             cliente HTTP contra VITE_API_URL
│       ├── format.js          formatearPesos (duplicado deliberado, es solo presentación)
│       ├── components/
│       │   ├── Layout.jsx     shell + navegación responsive
│       │   ├── Toast.jsx      contexto de errores
│       │   └── TrendChart.jsx SVG de tendencia fiado/abono
│       ├── pages/
│       │   ├── Resumen.jsx
│       │   ├── Clientes.jsx
│       │   ├── Cliente.jsx
│       │   ├── Caja.jsx
│       │   └── Reportes.jsx
│       └── styles/
│           └── global.css
├── docker-compose.yml
└── (v1: logic.js, app.js, index.html, manifest.json, sw.js, test.js — se retiran en la última tarea)
```

---

### Task 1: Backend — scaffold + esquema SQLite + capa de acceso a datos

**Files:**
- Create: `backend/package.json`
- Create: `backend/db.js`
- Test: `backend/test.js`

**Interfaces:**
- Produces: `db` (instancia `node:sqlite` `DatabaseSync`), `queries.{listarClientes,crearCliente,eliminarCliente,buscarCliente,listarMovimientos,movimientosDeCliente,crearMovimiento,eliminarMovimiento,buscarMovimiento,movimientosEnRango,listarCaja,crearCaja,cajaEnRango}` (statements preparados), `generarId()`, `ahoraISO()`, `mapMovimiento(row)`.

- [ ] **Step 1: Crear `backend/package.json`**

```json
{
  "name": "backend",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node test.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0"
  }
}
```

(Sin dependencia de SQLite: se usa el módulo nativo `node:sqlite`, disponible desde Node 22+. Cero compilación, cero binario prebuilt que pueda faltar.)

- [ ] **Step 2: Instalar dependencias**

Run: `cd backend && npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 3: Escribir `backend/db.js`**

```js
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'fiado.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT DEFAULT '',
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movimientos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('fiado', 'abono')),
    monto INTEGER NOT NULL CHECK (monto > 0),
    fecha TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS caja (
    id TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    monto INTEGER NOT NULL CHECK (monto > 0),
    nota TEXT DEFAULT ''
  );
`);

export function generarId() {
  return crypto.randomUUID();
}

export function ahoraISO() {
  return new Date().toISOString();
}

export function mapMovimiento(row) {
  return { id: row.id, clienteId: row.cliente_id, tipo: row.tipo, monto: row.monto, fecha: row.fecha };
}

export const queries = {
  listarClientes: db.prepare('SELECT * FROM clientes ORDER BY nombre'),
  crearCliente: db.prepare('INSERT INTO clientes (id, nombre, telefono, creado_en) VALUES (?, ?, ?, ?)'),
  eliminarCliente: db.prepare('DELETE FROM clientes WHERE id = ?'),
  buscarCliente: db.prepare('SELECT * FROM clientes WHERE id = ?'),

  listarMovimientos: db.prepare('SELECT * FROM movimientos'),
  movimientosDeCliente: db.prepare('SELECT * FROM movimientos WHERE cliente_id = ? ORDER BY fecha DESC'),
  crearMovimiento: db.prepare('INSERT INTO movimientos (id, cliente_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)'),
  eliminarMovimiento: db.prepare('DELETE FROM movimientos WHERE id = ?'),
  buscarMovimiento: db.prepare('SELECT * FROM movimientos WHERE id = ?'),
  movimientosEnRango: db.prepare('SELECT * FROM movimientos WHERE fecha >= ? AND fecha <= ? ORDER BY fecha'),

  listarCaja: db.prepare('SELECT * FROM caja ORDER BY fecha DESC'),
  crearCaja: db.prepare('INSERT INTO caja (id, fecha, monto, nota) VALUES (?, ?, ?, ?)'),
  cajaEnRango: db.prepare('SELECT * FROM caja WHERE fecha >= ? AND fecha <= ? ORDER BY fecha'),
};
```

- [ ] **Step 4: Escribir `backend/test.js`**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fiado-test-'));

const { queries, generarId, ahoraISO } = await import('./db.js');

// --- db.js: capa de acceso a datos ---
const clienteId = generarId();
queries.crearCliente.run(clienteId, 'Doña Rosa', '', ahoraISO());
const cliente = queries.buscarCliente.get(clienteId);
assert.equal(cliente.nombre, 'Doña Rosa');

const movId = generarId();
queries.crearMovimiento.run(movId, clienteId, 'fiado', 12500, ahoraISO());
const movimientosCliente = queries.movimientosDeCliente.all(clienteId);
assert.equal(movimientosCliente.length, 1);
assert.equal(movimientosCliente[0].monto, 12500);

queries.eliminarCliente.run(clienteId);
assert.equal(queries.movimientosDeCliente.all(clienteId).length, 0); // ON DELETE CASCADE

console.log('OK: todas las pruebas pasaron');
```

- [ ] **Step 5: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/db.js backend/test.js
git commit -m "feat(backend): esquema SQLite y capa de acceso a datos"
```

---

### Task 2: Backend — `logic.js` portado de v1

**Files:**
- Create: `backend/logic.js`
- Modify: `backend/test.js`

**Interfaces:**
- Produces: `validarMonto(valor)`, `parsearMonto(valor)`, `formatearPesos(valor)`, `saldoCliente(clienteId, movimientos)`, `totalFiado(clientes, movimientos)`, `ordenarPorFechaDesc(items)` — idénticas a `logic.js` de v1 en la raíz del proyecto.

- [ ] **Step 1: Copiar `backend/logic.js`** (idéntico al `logic.js` de v1)

```js
export function validarMonto(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export function parsearMonto(valor) {
  return Math.trunc(Number(valor));
}

export function formatearPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function saldoCliente(clienteId, movimientos) {
  return movimientos
    .filter((m) => m.clienteId === clienteId)
    .reduce((acc, m) => acc + (m.tipo === 'fiado' ? m.monto : -m.monto), 0);
}

export function totalFiado(clientes, movimientos) {
  return clientes.reduce((acc, c) => acc + saldoCliente(c.id, movimientos), 0);
}

export function ordenarPorFechaDesc(items) {
  return [...items].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
```

- [ ] **Step 2: Agregar el import al inicio de `backend/test.js`**

```js
import {
  validarMonto,
  parsearMonto,
  formatearPesos,
  saldoCliente,
  totalFiado,
  ordenarPorFechaDesc,
} from './logic.js';
```

- [ ] **Step 3: Insertar en `backend/test.js`, justo antes de `console.log('OK: todas las pruebas pasaron');`**

```js
// --- logic.js: aritmética pura ---
assert.equal(validarMonto(12500), true);
assert.equal(validarMonto(0), false);
assert.equal(validarMonto(-100), false);
assert.equal(validarMonto('abc'), false);
assert.equal(validarMonto(1.5), false);
assert.equal(parsearMonto('12500.9'), 12500);
assert.equal(formatearPesos(12500).includes('12.500'), true);

const movsPrueba = [
  { clienteId: 'a', tipo: 'fiado', monto: 12500 },
  { clienteId: 'a', tipo: 'fiado', monto: 3000 },
  { clienteId: 'a', tipo: 'abono', monto: 10000 },
];
assert.equal(saldoCliente('a', movsPrueba), 5500);
assert.equal(totalFiado([{ id: 'a' }], movsPrueba), 5500);

const conAbonoDeMas = [
  { clienteId: 'a', tipo: 'fiado', monto: 5000 },
  { clienteId: 'a', tipo: 'abono', monto: 8000 },
];
assert.equal(saldoCliente('a', conAbonoDeMas), -3000);

const ordenados = ordenarPorFechaDesc([
  { fecha: '2026-01-01T10:00:00.000Z' },
  { fecha: '2026-01-03T10:00:00.000Z' },
]);
assert.equal(ordenados[0].fecha, '2026-01-03T10:00:00.000Z');
```

- [ ] **Step 4: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 5: Commit**

```bash
git add backend/logic.js backend/test.js
git commit -m "feat(backend): portar logic.js de v1 sin cambios de comportamiento"
```

---

### Task 3: Backend — servidor Express + rutas de clientes

**Files:**
- Create: `backend/server.js`
- Create: `backend/routes/clientes.js`
- Modify: `backend/test.js`

**Interfaces:**
- Consumes: `queries`, `mapMovimiento`, `generarId`, `ahoraISO` de `../db.js`; `saldoCliente` de `../logic.js`.
- Produces: `crearApp()` (exportada de `server.js`, sin efectos secundarios — no escucha si `NODE_ENV === 'test'`). Rutas `GET/POST /api/clientes`, `GET /api/clientes/:id/movimientos`, `DELETE /api/clientes/:id`.

- [ ] **Step 1: Escribir `backend/routes/clientes.js`**

```js
import { Router } from 'express';
import { queries, mapMovimiento, generarId, ahoraISO } from '../db.js';
import { saldoCliente } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const clientes = queries.listarClientes.all();
  const movimientos = queries.listarMovimientos.all().map(mapMovimiento);
  res.json(
    clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      saldo: saldoCliente(c.id, movimientos),
    }))
  );
});

router.post('/', (req, res) => {
  const nombre = (req.body.nombre || '').trim();
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const cliente = { id: generarId(), nombre, telefono: '', creadoEn: ahoraISO() };
  queries.crearCliente.run(cliente.id, cliente.nombre, cliente.telefono, cliente.creadoEn);
  res.status(201).json({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, saldo: 0 });
});

router.get('/:id/movimientos', (req, res) => {
  const cliente = queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(queries.movimientosDeCliente.all(req.params.id).map(mapMovimiento));
});

router.delete('/:id', (req, res) => {
  const cliente = queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  queries.eliminarCliente.run(req.params.id);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Escribir `backend/server.js`**

```js
import express from 'express';
import cors from 'cors';
import clientesRouter from './routes/clientes.js';

export function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/clientes', clientesRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = crearApp();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API escuchando en :${PORT}`));
}
```

- [ ] **Step 3: Agregar `process.env.NODE_ENV = 'test';` en `backend/test.js`, justo debajo de la línea `process.env.DATA_DIR = ...`**

- [ ] **Step 4: Insertar en `backend/test.js`, justo antes de `console.log('OK: todas las pruebas pasaron');`**

```js
// --- servidor de pruebas ---
const { crearApp } = await import('./server.js');
const app = crearApp();
const servidor = app.listen(0);
const base = `http://localhost:${servidor.address().port}`;

// --- rutas /api/clientes ---
let respuesta = await fetch(`${base}/api/clientes`);
assert.equal(respuesta.status, 200);
assert.deepEqual(await respuesta.json(), []);

respuesta = await fetch(`${base}/api/clientes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'Don Pedro' }),
});
assert.equal(respuesta.status, 201);
const donPedro = await respuesta.json();
assert.equal(donPedro.nombre, 'Don Pedro');
assert.equal(donPedro.saldo, 0);

respuesta = await fetch(`${base}/api/clientes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: '' }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}/movimientos`);
assert.equal(respuesta.status, 200);
assert.deepEqual(await respuesta.json(), []);

respuesta = await fetch(`${base}/api/clientes/no-existe/movimientos`);
assert.equal(respuesta.status, 404);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 204);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 404);
```

- [ ] **Step 5: Agregar al final de `backend/test.js`, justo antes de `console.log('OK: todas las pruebas pasaron');`**

```js
servidor.close();
```

(Esta línea `servidor.close()` es el ancla que las tareas 4, 5 y 6 usarán para insertar más pruebas antes de ella.)

- [ ] **Step 6: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 7: Commit**

```bash
git add backend/server.js backend/routes/clientes.js backend/test.js
git commit -m "feat(backend): servidor Express y rutas de clientes"
```

---

### Task 4: Backend — rutas de movimientos (fiar/abonar)

**Files:**
- Create: `backend/routes/movimientos.js`
- Modify: `backend/server.js`
- Modify: `backend/test.js`

**Interfaces:**
- Consumes: `queries`, `generarId`, `ahoraISO` de `../db.js`; `validarMonto`, `parsearMonto` de `../logic.js`.
- Produces: `POST /api/movimientos` `{ clienteId, tipo, monto }` → 201 con el movimiento creado; `DELETE /api/movimientos/:id` → 204.

- [ ] **Step 1: Escribir `backend/routes/movimientos.js`**

```js
import { Router } from 'express';
import { queries, generarId, ahoraISO } from '../db.js';
import { validarMonto, parsearMonto } from '../logic.js';

const router = Router();

router.post('/', (req, res) => {
  const { clienteId, tipo, monto } = req.body;
  if (tipo !== 'fiado' && tipo !== 'abono') {
    return res.status(400).json({ error: "tipo debe ser 'fiado' o 'abono'" });
  }
  const cliente = queries.buscarCliente.get(clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  const montoNum = parsearMonto(monto);
  if (!validarMonto(montoNum)) {
    return res.status(400).json({ error: 'Ingresa un monto válido, mayor a cero' });
  }
  const mov = { id: generarId(), clienteId, tipo, monto: montoNum, fecha: ahoraISO() };
  queries.crearMovimiento.run(mov.id, mov.clienteId, mov.tipo, mov.monto, mov.fecha);
  res.status(201).json(mov);
});

router.delete('/:id', (req, res) => {
  const mov = queries.buscarMovimiento.get(req.params.id);
  if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
  queries.eliminarMovimiento.run(req.params.id);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: En `backend/server.js`, agregar el import** debajo de `import clientesRouter from './routes/clientes.js';`

```js
import movimientosRouter from './routes/movimientos.js';
```

**y montar la ruta** debajo de `app.use('/api/clientes', clientesRouter);`

```js
app.use('/api/movimientos', movimientosRouter);
```

- [ ] **Step 3: Insertar en `backend/test.js`, justo antes de `servidor.close();`**

```js
// --- rutas /api/movimientos ---
respuesta = await fetch(`${base}/api/clientes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'Doña Marta' }),
});
const donaMarta = await respuesta.json();

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clienteId: donaMarta.id, tipo: 'fiado', monto: 15000 }),
});
assert.equal(respuesta.status, 201);
const fiado1 = await respuesta.json();
assert.equal(fiado1.monto, 15000);

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clienteId: donaMarta.id, tipo: 'abono', monto: 5000 }),
});
assert.equal(respuesta.status, 201);

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clienteId: donaMarta.id, tipo: 'fiado', monto: -100 }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clienteId: 'no-existe', tipo: 'fiado', monto: 1000 }),
});
assert.equal(respuesta.status, 404);

respuesta = await fetch(`${base}/api/clientes`);
const listaClientes = await respuesta.json();
const martaConSaldo = listaClientes.find((c) => c.id === donaMarta.id);
assert.equal(martaConSaldo.saldo, 10000);

respuesta = await fetch(`${base}/api/movimientos/${fiado1.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 204);

respuesta = await fetch(`${base}/api/clientes`);
const listaTrasBorrar = (await respuesta.json()).find((c) => c.id === donaMarta.id);
assert.equal(listaTrasBorrar.saldo, -5000);
```

- [ ] **Step 4: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 5: Commit**

```bash
git add backend/routes/movimientos.js backend/server.js backend/test.js
git commit -m "feat(backend): rutas de movimientos (fiar/abonar)"
```

---

### Task 5: Backend — rutas de caja

**Files:**
- Create: `backend/routes/caja.js`
- Modify: `backend/server.js`
- Modify: `backend/test.js`

**Interfaces:**
- Produces: `GET /api/caja` → lista de cierres; `POST /api/caja` `{ monto, nota }` → 201.

- [ ] **Step 1: Escribir `backend/routes/caja.js`**

```js
import { Router } from 'express';
import { queries, generarId, ahoraISO } from '../db.js';
import { validarMonto, parsearMonto } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(queries.listarCaja.all());
});

router.post('/', (req, res) => {
  const montoNum = parsearMonto(req.body.monto);
  if (!validarMonto(montoNum)) {
    return res.status(400).json({ error: 'Ingresa un monto válido, mayor a cero' });
  }
  const nota = (req.body.nota || '').trim();
  const cierre = { id: generarId(), fecha: ahoraISO(), monto: montoNum, nota };
  queries.crearCaja.run(cierre.id, cierre.fecha, cierre.monto, cierre.nota);
  res.status(201).json(cierre);
});

export default router;
```

- [ ] **Step 2: En `backend/server.js`, agregar el import** debajo del de `movimientosRouter`

```js
import cajaRouter from './routes/caja.js';
```

**y montar la ruta** debajo de `app.use('/api/movimientos', movimientosRouter);`

```js
app.use('/api/caja', cajaRouter);
```

- [ ] **Step 3: Insertar en `backend/test.js`, justo antes de `servidor.close();`**

```js
// --- rutas /api/caja ---
respuesta = await fetch(`${base}/api/caja`);
assert.deepEqual(await respuesta.json(), []);

respuesta = await fetch(`${base}/api/caja`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 250000, nota: 'cierre normal' }),
});
assert.equal(respuesta.status, 201);

respuesta = await fetch(`${base}/api/caja`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 0, nota: '' }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/caja`);
const historialCaja = await respuesta.json();
assert.equal(historialCaja.length, 1);
assert.equal(historialCaja[0].monto, 250000);
```

- [ ] **Step 4: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 5: Commit**

```bash
git add backend/routes/caja.js backend/server.js backend/test.js
git commit -m "feat(backend): rutas de caja"
```

---

### Task 6: Backend — resumen y reportes

**Files:**
- Create: `backend/routes/resumen.js`
- Create: `backend/routes/reportes.js`
- Modify: `backend/server.js`
- Modify: `backend/test.js`

**Interfaces:**
- Produces: `GET /api/resumen` → `{ totalFiado, clientesConDeuda, cajaHoy, topDeudores }`; `GET /api/reportes?desde=&hasta=` → `{ movimientos, caja, porDia }`, donde `porDia` es `[{ dia, fiado, abono }]` ordenado ascendente.

- [ ] **Step 1: Escribir `backend/routes/resumen.js`**

```js
import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';
import { saldoCliente, totalFiado } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const clientes = queries.listarClientes.all();
  const movimientos = queries.listarMovimientos.all().map(mapMovimiento);
  const clientesConSaldo = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: saldoCliente(c.id, movimientos),
  }));
  const hoy = new Date().toISOString().slice(0, 10);
  const cajaHoy = queries.listarCaja.all().filter((c) => c.fecha.slice(0, 10) === hoy);
  const topDeudores = clientesConSaldo
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  res.json({
    totalFiado: totalFiado(clientes, movimientos),
    clientesConDeuda: clientesConSaldo.filter((c) => c.saldo > 0).length,
    cajaHoy: cajaHoy.reduce((acc, c) => acc + c.monto, 0),
    topDeudores,
  });
});

export default router;
```

- [ ] **Step 2: Escribir `backend/routes/reportes.js`**

```js
import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Los parámetros desde y hasta son obligatorios (YYYY-MM-DD)' });
  }
  const desdeISO = `${desde}T00:00:00.000Z`;
  const hastaISO = `${hasta}T23:59:59.999Z`;

  const movimientos = queries.movimientosEnRango.all(desdeISO, hastaISO).map(mapMovimiento);
  const cajas = queries.cajaEnRango.all(desdeISO, hastaISO);

  const porDia = {};
  for (const m of movimientos) {
    const dia = m.fecha.slice(0, 10);
    porDia[dia] ??= { dia, fiado: 0, abono: 0 };
    porDia[dia][m.tipo] += m.monto;
  }

  res.json({
    movimientos,
    caja: cajas,
    porDia: Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)),
  });
});

export default router;
```

- [ ] **Step 3: En `backend/server.js`, agregar los imports** debajo del de `cajaRouter`

```js
import resumenRouter from './routes/resumen.js';
import reportesRouter from './routes/reportes.js';
```

**y montar las rutas** debajo de `app.use('/api/caja', cajaRouter);`

```js
app.use('/api/resumen', resumenRouter);
app.use('/api/reportes', reportesRouter);
```

- [ ] **Step 4: Insertar en `backend/test.js`, justo antes de `servidor.close();`**

```js
// --- rutas /api/resumen y /api/reportes ---
respuesta = await fetch(`${base}/api/resumen`);
assert.equal(respuesta.status, 200);
const resumen = await respuesta.json();
assert.equal(typeof resumen.totalFiado, 'number');
assert.ok(resumen.topDeudores.length <= 5);

const hoy = new Date().toISOString().slice(0, 10);
respuesta = await fetch(`${base}/api/reportes?desde=${hoy}&hasta=${hoy}`);
assert.equal(respuesta.status, 200);
const reporte = await respuesta.json();
assert.ok(Array.isArray(reporte.movimientos));
assert.ok(Array.isArray(reporte.porDia));

respuesta = await fetch(`${base}/api/reportes`);
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/ruta-inexistente`);
assert.equal(respuesta.status, 404);
```

- [ ] **Step 5: Correr las pruebas**

Run: `cd backend && node test.js`
Expected: `OK: todas las pruebas pasaron`

- [ ] **Step 6: Commit**

```bash
git add backend/routes/resumen.js backend/routes/reportes.js backend/server.js backend/test.js
git commit -m "feat(backend): resumen y reportes por rango de fechas"
```

---

### Task 7: Backend — Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Produces: imagen Docker que expone el puerto 4000 y persiste `DATA_DIR=/app/data`.

- [ ] **Step 1: Escribir `backend/.dockerignore`**

```
node_modules
data
```

- [ ] **Step 2: Escribir `backend/Dockerfile`**

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV DATA_DIR=/app/data
EXPOSE 4000
CMD ["node", "server.js"]
```

(Node 22, no 20: es el mínimo que trae `node:sqlite` estable — sin esto el backend no arranca dentro del contenedor. Sin dependencia nativa que compilar, así que `alpine` también serviría, pero se mantiene `bookworm-slim` por consistencia con el resto de las imágenes.)

- [ ] **Step 3: Construir y probar la imagen**

Run: `cd backend && docker build -t fiado-api . && docker run --rm -p 4000:4000 -d --name fiado-api-test fiado-api`
Expected: build sin errores, contenedor arranca.

Run: `curl -s http://localhost:4000/api/resumen`
Expected: JSON con `totalFiado`, `clientesConDeuda`, `cajaHoy`, `topDeudores`.

Run: `docker stop fiado-api-test`

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat(backend): Dockerfile"
```

---

### Task 8: Frontend — scaffold, cliente HTTP y tokens de diseño

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/api.js`
- Create: `frontend/src/format.js`
- Create: `frontend/src/styles/global.css`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Produces: `api.{listarClientes,crearCliente,eliminarCliente,movimientosDeCliente,crearMovimiento,eliminarMovimiento,listarCaja,cerrarCaja,resumen,reportes}` (todas retornan promesas, lanzan `Error(mensaje)` si `respuesta.ok` es falso); `formatearPesos(valor)`.

Nota de diseño: usa la skill `frontend-design` como guía de dirección visual al ajustar `global.css` en esta y las tareas siguientes — el sistema de tokens de abajo es el punto de partida, no el resultado final.

- [ ] **Step 1: Escribir `frontend/package.json`**

```json
{
  "name": "frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 8080 --host"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

Run: `cd frontend && npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 3: Escribir `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
```

- [ ] **Step 4: Escribir `frontend/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fiado — Dashboard</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Escribir `frontend/src/format.js`**

```js
export function formatearPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}
```

- [ ] **Step 6: Escribir `frontend/src/api.js`**

```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Error inesperado');
  return datos;
}

export const api = {
  listarClientes: () => solicitar('/api/clientes'),
  crearCliente: (nombre) => solicitar('/api/clientes', { method: 'POST', body: JSON.stringify({ nombre }) }),
  eliminarCliente: (id) => solicitar(`/api/clientes/${id}`, { method: 'DELETE' }),
  movimientosDeCliente: (id) => solicitar(`/api/clientes/${id}/movimientos`),
  crearMovimiento: (clienteId, tipo, monto) =>
    solicitar('/api/movimientos', { method: 'POST', body: JSON.stringify({ clienteId, tipo, monto }) }),
  eliminarMovimiento: (id) => solicitar(`/api/movimientos/${id}`, { method: 'DELETE' }),
  listarCaja: () => solicitar('/api/caja'),
  cerrarCaja: (monto, nota) => solicitar('/api/caja', { method: 'POST', body: JSON.stringify({ monto, nota }) }),
  resumen: () => solicitar('/api/resumen'),
  reportes: (desde, hasta) => solicitar(`/api/reportes?desde=${desde}&hasta=${hasta}`),
};
```

- [ ] **Step 7: Escribir `frontend/src/styles/global.css`**

```css
:root {
  --verde: #16a34a;
  --verde-suave: #dcfce7;
  --rojo: #dc2626;
  --rojo-suave: #fee2e2;
  --fondo: #f4f5f7;
  --superficie: #ffffff;
  --texto: #111827;
  --texto-suave: #6b7280;
  --borde: #e5e7eb;
  --sombra: 0 1px 3px rgba(0,0,0,0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --fondo: #0f1115;
    --superficie: #1a1d23;
    --texto: #f3f4f6;
    --texto-suave: #9ca3af;
    --borde: #2a2e37;
    --verde-suave: #14532d;
    --rojo-suave: #7f1d1d;
  }
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--fondo);
  color: var(--texto);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
button, input { font-family: inherit; }

.shell { display: grid; grid-template-columns: 1fr; min-height: 100vh; }
.sidebar { display: none; }
.marca { font-size: 20px; font-weight: 800; padding: 20px; margin: 0; }

.nav { display: flex; gap: 4px; }
.nav-sidebar { flex-direction: column; padding: 0 12px; }
.nav-bottom {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--superficie); border-top: 1px solid var(--borde);
  justify-content: space-around; padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  z-index: 10;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 12px; border-radius: 10px; text-decoration: none;
  color: var(--texto-suave); font-size: 12px; font-weight: 600;
}
.nav-sidebar .nav-item { flex-direction: row; font-size: 15px; padding: 12px; }
.nav-item.activo { color: var(--verde); background: var(--verde-suave); }
.nav-icono { font-size: 18px; }

.contenido { padding: 16px 16px 90px; max-width: 960px; width: 100%; margin: 0 auto; }
.pagina-cabecera { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
h2 { font-size: 22px; margin: 0 0 12px; }

.btn-primario { background: var(--verde); color: #fff; border: none; border-radius: 10px; padding: 12px 18px; font-weight: 700; font-size: 15px; }
.buscador { width: 100%; padding: 14px; font-size: 16px; border: 1px solid var(--borde); border-radius: 10px; background: var(--superficie); color: var(--texto); margin-bottom: 12px; }

.lista-clientes { list-style: none; margin: 0; padding: 0; }
.fila-cliente { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; margin-bottom: 8px; text-decoration: none; color: inherit; }
.nombre { font-weight: 600; }
.saldo { font-weight: 700; color: var(--texto-suave); }
.saldo.debe { color: var(--rojo); }
.saldo.favor { color: var(--verde); }
.vacio { text-align: center; color: var(--texto-suave); padding: 40px 0; list-style: none; }

.btn-volver { border: none; background: none; color: var(--verde); font-weight: 700; padding: 4px 0; margin-bottom: 8px; }

.saldo-grande { text-align: center; padding: 24px; font-size: 36px; font-weight: 800; color: var(--texto-suave); background: var(--superficie); border-radius: 16px; border: 1px solid var(--borde); }
.saldo-grande.debe { color: var(--rojo); }
.saldo-grande.favor { color: var(--verde); }
.saldo-grande small { display: block; font-size: 13px; font-weight: 600; color: var(--texto-suave); margin-top: 4px; }

.acciones { display: flex; gap: 12px; margin: 16px 0; }
.acciones button { flex: 1; padding: 16px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; color: #fff; }
.btn-fiar { background: var(--rojo); }
.btn-abonar { background: var(--verde); }

.historial, .historial-caja { list-style: none; margin: 0; padding: 0; }
.fila-mov { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 12px; border-bottom: 1px solid var(--borde); font-size: 14px; }
.historial-caja li { display: grid; grid-template-columns: auto auto 1fr; gap: 10px; padding: 12px; border-bottom: 1px solid var(--borde); font-size: 14px; }
.tipo { font-weight: 700; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
.tipo.fiado { background: var(--rojo-suave); color: var(--rojo); }
.tipo.abono { background: var(--verde-suave); color: var(--verde); }
.fecha { color: var(--texto-suave); font-size: 12px; white-space: nowrap; }
.btn-borrar { border: none; background: none; color: var(--texto-suave); font-size: 16px; }

.btn-eliminar-cliente { margin: 16px 0; padding: 12px; border: 1px solid var(--rojo); background: none; color: var(--rojo); border-radius: 10px; width: 100%; }

.form-caja, .form-reportes { display: flex; flex-direction: column; gap: 8px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.form-reportes { flex-direction: row; flex-wrap: wrap; align-items: end; gap: 12px; }
.form-caja label, .form-reportes label { font-size: 13px; color: var(--texto-suave); font-weight: 600; }
.form-caja input, .form-reportes input { padding: 12px; font-size: 15px; border: 1px solid var(--borde); border-radius: 10px; background: var(--fondo); color: var(--texto); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center; z-index: 20; }
.dialogo { background: var(--superficie); width: 100%; max-width: 480px; border-radius: 20px 20px 0 0; padding: 24px 20px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; }
.dialogo input { padding: 16px; font-size: 22px; text-align: center; border: 1px solid var(--borde); border-radius: 10px; background: var(--fondo); color: var(--texto); }
.dialogo-acciones { display: flex; gap: 10px; }
.dialogo-acciones button { flex: 1; padding: 14px; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; }
.dialogo-acciones button[type="button"] { background: var(--fondo); color: var(--texto); }
.dialogo-acciones button[type="submit"] { background: var(--verde); color: #fff; }

.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
.tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: 14px; padding: 16px; box-shadow: var(--sombra); }
.tarjeta-etiqueta { display: block; font-size: 13px; color: var(--texto-suave); margin-bottom: 6px; }
.tarjeta-valor { font-size: 24px; font-weight: 800; }
.tarjeta-valor.debe { color: var(--rojo); }
.tarjeta-valor.favor { color: var(--verde); }

.trend-chart { width: 100%; height: auto; margin: 8px 0 24px; }
.chart-eje { stroke: var(--borde); stroke-width: 1; }
.chart-linea { fill: none; stroke-width: 2; }
.chart-linea-fiado { stroke: var(--rojo); }
.chart-linea-abono { stroke: var(--verde); }
.chart-punto-fiado { fill: var(--rojo); }
.chart-punto-abono { fill: var(--verde); }
.chart-vacio { color: var(--texto-suave); text-align: center; padding: 24px; }

.tabla-reporte-wrap { overflow-x: auto; }
.tabla-reporte { width: 100%; border-collapse: collapse; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; }
.tabla-reporte th, .tabla-reporte td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--borde); font-size: 14px; white-space: nowrap; }
.tabla-reporte th { color: var(--texto-suave); font-weight: 600; }

.toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--texto); color: var(--fondo); padding: 12px 18px; border-radius: 10px; font-size: 14px; z-index: 30; max-width: 90%; }
.toast-error { background: var(--rojo); color: #fff; }

@media (min-width: 768px) {
  .shell { grid-template-columns: 240px 1fr; }
  .sidebar { display: block; border-right: 1px solid var(--borde); background: var(--superficie); }
  .nav-bottom { display: none; }
  .contenido { padding: 32px; max-width: 100%; }
}
```

- [ ] **Step 8: Escribir `frontend/src/main.jsx`** (placeholder mínimo — `App.jsx` llega en la Tarea 9)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

```jsx
// frontend/src/App.jsx — mínimo temporal, se reemplaza en la Tarea 9
export default function App() {
  return <p>Fiado — cargando...</p>;
}
```

- [ ] **Step 9: Escribir `frontend/.dockerignore`**

```
node_modules
dist
```

- [ ] **Step 10: Verificar que arranca**

Run: `cd frontend && npm run dev &` luego `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/`
Expected: `200`. Detener el proceso (`kill %1` o `Ctrl+C`).

- [ ] **Step 11: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/index.html frontend/src frontend/.dockerignore
git commit -m "feat(frontend): scaffold Vite+React, cliente HTTP y tokens de diseño"
```

---

### Task 9: Frontend — Layout responsive, Toast y enrutamiento

**Files:**
- Create: `frontend/src/components/Layout.jsx`
- Create: `frontend/src/components/Toast.jsx`
- Modify: `frontend/src/App.jsx`
- Create (temporal, se reemplazan en tareas 10-13): `frontend/src/pages/Resumen.jsx`, `frontend/src/pages/Clientes.jsx`, `frontend/src/pages/Cliente.jsx`, `frontend/src/pages/Caja.jsx`, `frontend/src/pages/Reportes.jsx`

**Interfaces:**
- Produces: `<Layout />` (usa `<Outlet />` de React Router), `<ToastProvider>` + `useToast()` → `{ mostrarError(texto) }`.
- Consumes en Tareas 10-13: `useToast()` de `./components/Toast.jsx`.

- [ ] **Step 1: Escribir `frontend/src/components/Toast.jsx`**

```jsx
import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [mensaje, setMensaje] = useState(null);

  const mostrarError = useCallback((texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarError }}>
      {children}
      {mensaje && (
        <div className="toast toast-error" role="alert">
          {mensaje}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

- [ ] **Step 2: Escribir `frontend/src/components/Layout.jsx`**

```jsx
import { NavLink, Outlet } from 'react-router-dom';
import { ToastProvider } from './Toast.jsx';

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', icono: '📊' },
  { to: '/clientes', etiqueta: 'Clientes', icono: '👥' },
  { to: '/caja', etiqueta: 'Caja', icono: '💰' },
  { to: '/reportes', etiqueta: 'Reportes', icono: '📅' },
];

function Navegacion({ variante }) {
  return (
    <nav className={`nav nav-${variante}`}>
      {ENLACES.map((e) => (
        <NavLink
          key={e.to}
          to={e.to}
          end={e.to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
        >
          <span className="nav-icono" aria-hidden="true">{e.icono}</span>
          <span className="nav-etiqueta">{e.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <h1 className="marca">Fiado</h1>
          <Navegacion variante="sidebar" />
        </aside>
        <main className="contenido">
          <Outlet />
        </main>
        <Navegacion variante="bottom" />
      </div>
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Crear páginas temporales** (contenido mínimo, se reemplazan en tareas 10-13)

```jsx
// frontend/src/pages/Resumen.jsx
export default function Resumen() { return <h2>Resumen</h2>; }
```

```jsx
// frontend/src/pages/Clientes.jsx
export default function Clientes() { return <h2>Clientes</h2>; }
```

```jsx
// frontend/src/pages/Cliente.jsx
export default function Cliente() { return <h2>Cliente</h2>; }
```

```jsx
// frontend/src/pages/Caja.jsx
export default function Caja() { return <h2>Caja</h2>; }
```

```jsx
// frontend/src/pages/Reportes.jsx
export default function Reportes() { return <h2>Reportes</h2>; }
```

- [ ] **Step 4: Reemplazar `frontend/src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Resumen from './pages/Resumen.jsx';
import Clientes from './pages/Clientes.jsx';
import Cliente from './pages/Cliente.jsx';
import Caja from './pages/Caja.jsx';
import Reportes from './pages/Reportes.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Resumen />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<Cliente />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/reportes" element={<Reportes />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 5: Verificar rutas**

Run: `cd frontend && npm run dev &`
Run: `curl -s http://localhost:5173/clientes | grep -o '<div id="root">'`
Expected: encuentra el `<div id="root">` (Vite sirve `index.html` para rutas del cliente — confirma que el fallback SPA funciona). Detener el proceso.

Nota: esto solo confirma que el servidor responde; la navegación real (clic en los links, resaltado del ítem activo, layout de escritorio vs. móvil) requiere abrir `http://localhost:5173` en un navegador — no hay herramienta de navegador en este entorno de ejecución. Verificar manualmente antes de dar la tarea por cerrada.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components frontend/src/pages frontend/src/App.jsx
git commit -m "feat(frontend): layout responsive, toast de errores y enrutamiento"
```

---

### Task 10: Frontend — páginas Clientes y Cliente

**Files:**
- Modify: `frontend/src/pages/Clientes.jsx`
- Modify: `frontend/src/pages/Cliente.jsx`

**Interfaces:**
- Consumes: `api.listarClientes`, `api.crearCliente`, `api.movimientosDeCliente`, `api.crearMovimiento`, `api.eliminarMovimiento`, `api.eliminarCliente` de `../api.js`; `formatearPesos` de `../format.js`; `useToast` de `../components/Toast.jsx`.

- [ ] **Step 1: Reemplazar `frontend/src/pages/Clientes.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Clientes() {
  const { mostrarError } = useToast();
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');

  async function cargar() {
    try {
      setClientes(await api.listarClientes());
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crearCliente(evento) {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    try {
      await api.crearCliente(nombre);
      setNombreNuevo('');
      setMostrarModal(false);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="pagina">
      <header className="pagina-cabecera">
        <h2>Clientes</h2>
        <button className="btn-primario" onClick={() => setMostrarModal(true)}>+ Cliente</button>
      </header>
      <input
        type="search"
        className="buscador"
        placeholder="Buscar cliente..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <ul className="lista-clientes">
        {filtrados.map((c) => (
          <li key={c.id}>
            <Link to={`/clientes/${c.id}`} className="fila-cliente">
              <span className="nombre">{c.nombre}</span>
              <span className={`saldo ${c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'favor' : ''}`}>
                {formatearPesos(Math.abs(c.saldo))}{c.saldo < 0 ? ' a favor' : ''}
              </span>
            </Link>
          </li>
        ))}
        {!filtrados.length && <li className="vacio">Sin clientes todavía.</li>}
      </ul>

      {mostrarModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setMostrarModal(false)}>
          <form className="dialogo" onSubmit={crearCliente}>
            <h2>Nuevo cliente</h2>
            <input
              type="text"
              autoFocus
              placeholder="Nombre"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              required
            />
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setMostrarModal(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar `frontend/src/pages/Cliente.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Cliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarError } = useToast();
  const [cliente, setCliente] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const [monto, setMonto] = useState('');

  async function cargar() {
    try {
      const clientes = await api.listarClientes();
      const encontrado = clientes.find((c) => c.id === id);
      if (!encontrado) return navigate('/clientes');
      setCliente(encontrado);
      setMovimientos(await api.movimientosDeCliente(id));
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, [id]);

  async function guardarMovimiento(evento) {
    evento.preventDefault();
    try {
      await api.crearMovimiento(id, dialogo, Number(monto));
      setMonto('');
      setDialogo(null);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function borrarMovimiento(movId) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.eliminarMovimiento(movId);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function eliminarCliente() {
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borra todo su historial.`)) return;
    try {
      await api.eliminarCliente(id);
      navigate('/clientes');
    } catch (e) {
      mostrarError(e.message);
    }
  }

  if (!cliente) return null;
  const saldo = cliente.saldo;

  return (
    <div className="pagina">
      <button className="btn-volver" onClick={() => navigate('/clientes')}>← Clientes</button>
      <h2>{cliente.nombre}</h2>
      <div className={`saldo-grande ${saldo > 0 ? 'debe' : saldo < 0 ? 'favor' : ''}`}>
        {formatearPesos(Math.abs(saldo))}
        <small>{saldo < 0 ? 'a favor' : saldo === 0 ? 'al día' : 'debe'}</small>
      </div>
      <div className="acciones">
        <button className="btn-fiar" onClick={() => setDialogo('fiado')}>Fiar</button>
        <button className="btn-abonar" onClick={() => setDialogo('abono')}>Abonar</button>
      </div>
      <ul className="historial">
        {movimientos.map((m) => (
          <li key={m.id} className="fila-mov">
            <span className={`tipo ${m.tipo}`}>{m.tipo === 'fiado' ? 'Fió' : 'Abonó'}</span>
            <span className="monto">{formatearPesos(m.monto)}</span>
            <span className="fecha">
              {new Date(m.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <button className="btn-borrar" onClick={() => borrarMovimiento(m.id)} aria-label="Eliminar">✕</button>
          </li>
        ))}
        {!movimientos.length && <li className="vacio">Sin movimientos todavía.</li>}
      </ul>
      <button className="btn-eliminar-cliente" onClick={eliminarCliente}>Eliminar cliente</button>

      {dialogo && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDialogo(null)}>
          <form className="dialogo" onSubmit={guardarMovimiento}>
            <h2>{dialogo === 'fiado' ? 'Fiar' : 'Abonar'}</h2>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setDialogo(null)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificación manual**

Run backend: `cd backend && node server.js &`
Run frontend: `cd frontend && npm run dev &`
Abrir `http://localhost:5173` en el navegador: crear cliente, entrar a su detalle, fiar 12.500, fiar 3.000 (saldo $15.500), abonar 10.000 (saldo $5.500), eliminar el fiado de 3.000 (saldo $2.500), eliminar el cliente. Confirmar que no aparece ningún error en la consola del navegador.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Clientes.jsx frontend/src/pages/Cliente.jsx
git commit -m "feat(frontend): páginas de clientes y detalle de cliente"
```

---

### Task 11: Frontend — página Caja

**Files:**
- Modify: `frontend/src/pages/Caja.jsx`

**Interfaces:**
- Consumes: `api.listarCaja`, `api.cerrarCaja` de `../api.js`.

- [ ] **Step 1: Reemplazar `frontend/src/pages/Caja.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Caja() {
  const { mostrarError } = useToast();
  const [historial, setHistorial] = useState([]);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  async function cargar() {
    try {
      setHistorial(await api.listarCaja());
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardar(evento) {
    evento.preventDefault();
    try {
      await api.cerrarCaja(Number(monto), nota);
      setMonto('');
      setNota('');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  return (
    <div className="pagina">
      <h2>Caja</h2>
      <form className="form-caja" onSubmit={guardar}>
        <label htmlFor="monto-caja">Plata en caja hoy</label>
        <input id="monto-caja" type="text" inputMode="numeric" placeholder="0" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        <label htmlFor="nota-caja">Nota (opcional)</label>
        <input id="nota-caja" type="text" placeholder="Ej: faltó cambio" value={nota} onChange={(e) => setNota(e.target.value)} />
        <button type="submit" className="btn-primario">Guardar cierre del día</button>
      </form>
      <ul className="historial-caja">
        {historial.map((c) => (
          <li key={c.id}>
            <span className="fecha">{new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="monto">{formatearPesos(c.monto)}</span>
            <span className="nota">{c.nota}</span>
          </li>
        ))}
        {!historial.length && <li className="vacio">Sin cierres todavía.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verificación manual**

Con backend y frontend corriendo (Task 10, Step 3), abrir `/caja`, cerrar caja con un monto y confirmar que aparece en el historial con la fecha de hoy.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Caja.jsx
git commit -m "feat(frontend): página de caja"
```

---

### Task 12: Frontend — TrendChart y página Resumen

**Files:**
- Create: `frontend/src/components/TrendChart.jsx`
- Modify: `frontend/src/pages/Resumen.jsx`

**Interfaces:**
- Produces: `<TrendChart datos={[{ dia, fiado, abono }]} />` — SVG inline, sin dependencias externas.
- Consumes: `api.resumen`, `api.reportes` de `../api.js`.

Nota de diseño: usa la skill `dataviz` como referencia de paleta y accesibilidad (colores consistentes con `.chart-linea-fiado`/`.chart-linea-abono` de `global.css`, `<title>` en cada punto para tooltip accesible) al ajustar este componente.

- [ ] **Step 1: Escribir `frontend/src/components/TrendChart.jsx`**

```jsx
import { formatearPesos } from '../format.js';

export default function TrendChart({ datos }) {
  const ancho = 600;
  const alto = 220;
  const margen = { top: 16, right: 16, bottom: 28, left: 48 };
  const areaAncho = ancho - margen.left - margen.right;
  const areaAlto = alto - margen.top - margen.bottom;

  if (!datos.length) {
    return <p className="chart-vacio">Sin movimientos en este rango.</p>;
  }

  const maxValor = Math.max(1, ...datos.flatMap((d) => [d.fiado, d.abono]));
  const x = (i) => margen.left + (i / Math.max(1, datos.length - 1)) * areaAncho;
  const y = (v) => margen.top + areaAlto - (v / maxValor) * areaAlto;
  const linea = (campo) => datos.map((d, i) => `${x(i)},${y(d[campo])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="trend-chart" role="img" aria-label="Tendencia de fiado y abonos">
      <line x1={margen.left} y1={margen.top + areaAlto} x2={ancho - margen.right} y2={margen.top + areaAlto} className="chart-eje" />
      <polyline points={linea('fiado')} className="chart-linea chart-linea-fiado" />
      <polyline points={linea('abono')} className="chart-linea chart-linea-abono" />
      {datos.map((d, i) => (
        <g key={d.dia}>
          <circle cx={x(i)} cy={y(d.fiado)} r="3" className="chart-punto-fiado">
            <title>{`${d.dia} · Fiado: ${formatearPesos(d.fiado)}`}</title>
          </circle>
          <circle cx={x(i)} cy={y(d.abono)} r="3" className="chart-punto-abono">
            <title>{`${d.dia} · Abonos: ${formatearPesos(d.abono)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Reemplazar `frontend/src/pages/Resumen.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';

function rangoUltimos30Dias() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { desde: iso(desde), hasta: iso(hasta) };
}

export default function Resumen() {
  const { mostrarError } = useToast();
  const [resumen, setResumen] = useState(null);
  const [tendencia, setTendencia] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setResumen(await api.resumen());
        const { desde, hasta } = rangoUltimos30Dias();
        const reporte = await api.reportes(desde, hasta);
        setTendencia(reporte.porDia);
      } catch (e) {
        mostrarError(e.message);
      }
    })();
  }, []);

  if (!resumen) return null;

  return (
    <div className="pagina">
      <h2>Resumen</h2>
      <div className="tarjetas">
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Total fiado</span>
          <strong className="tarjeta-valor debe">{formatearPesos(resumen.totalFiado)}</strong>
        </div>
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Clientes que deben</span>
          <strong className="tarjeta-valor">{resumen.clientesConDeuda}</strong>
        </div>
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Caja de hoy</span>
          <strong className="tarjeta-valor favor">{formatearPesos(resumen.cajaHoy)}</strong>
        </div>
      </div>

      <h3>Tendencia (últimos 30 días)</h3>
      <TrendChart datos={tendencia} />

      <h3>Top deudores</h3>
      <ul className="lista-clientes">
        {resumen.topDeudores.map((c) => (
          <li key={c.id}>
            <Link to={`/clientes/${c.id}`} className="fila-cliente">
              <span className="nombre">{c.nombre}</span>
              <span className="saldo debe">{formatearPesos(c.saldo)}</span>
            </Link>
          </li>
        ))}
        {!resumen.topDeudores.length && <li className="vacio">Nadie debe por ahora.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Verificación manual**

Con datos ya creados en Tasks 10-11, abrir `/` (Resumen) y confirmar que las tarjetas y la gráfica reflejan los datos reales.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TrendChart.jsx frontend/src/pages/Resumen.jsx
git commit -m "feat(frontend): gráfica de tendencia y página de resumen"
```

---

### Task 13: Frontend — página Reportes

**Files:**
- Modify: `frontend/src/pages/Reportes.jsx`

**Interfaces:**
- Consumes: `api.reportes` de `../api.js`; `<TrendChart>` de `../components/TrendChart.jsx`.

- [ ] **Step 1: Reemplazar `frontend/src/pages/Reportes.jsx`**

```jsx
import { useState } from 'react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reportes() {
  const { mostrarError } = useToast();
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);

  async function consultar(evento) {
    evento.preventDefault();
    try {
      setReporte(await api.reportes(desde, hasta));
    } catch (e) {
      mostrarError(e.message);
    }
  }

  return (
    <div className="pagina">
      <h2>Reportes</h2>
      <form className="form-reportes" onSubmit={consultar}>
        <label htmlFor="desde">Desde</label>
        <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        <label htmlFor="hasta">Hasta</label>
        <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        <button type="submit" className="btn-primario">Consultar</button>
      </form>

      {reporte && (
        <>
          <TrendChart datos={reporte.porDia} />
          <div className="tabla-reporte-wrap">
            <table className="tabla-reporte">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Monto</th></tr>
              </thead>
              <tbody>
                {reporte.movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.fecha).toLocaleDateString('es-CO')}</td>
                    <td>{m.tipo === 'fiado' ? 'Fiado' : 'Abono'}</td>
                    <td>{formatearPesos(m.monto)}</td>
                  </tr>
                ))}
                {reporte.caja.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                    <td>Cierre de caja</td>
                    <td>{formatearPesos(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!reporte.movimientos.length && !reporte.caja.length && <p className="vacio">Sin datos en este rango.</p>}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificación manual**

Abrir `/reportes`, dejar el rango en "hoy" y consultar — debe listar los movimientos y cierres de caja creados en las tareas anteriores. Cerrar los procesos de `npm run dev` y `node server.js` al terminar.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Reportes.jsx
git commit -m "feat(frontend): página de reportes por rango de fechas"
```

---

### Task 14: Frontend — Dockerfile + nginx

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Produces: imagen Docker multi-stage que sirve el build de producción en el puerto 8080, con fallback de SPA.

- [ ] **Step 1: Escribir `frontend/nginx.conf`**

```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}
```

- [ ] **Step 2: Escribir `frontend/Dockerfile`**

```dockerfile
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

- [ ] **Step 3: Construir y probar la imagen**

Run: `cd frontend && docker build -t fiado-web --build-arg VITE_API_URL=http://localhost:4000 . && docker run --rm -p 8080:8080 -d --name fiado-web-test fiado-web`
Expected: build sin errores, contenedor arranca.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/` y `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/clientes`
Expected: `200` en ambos (confirma el fallback de nginx a `index.html`).

Run: `docker stop fiado-web-test`

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf
git commit -m "feat(frontend): Dockerfile multi-stage con nginx"
```

---

### Task 15: Docker Compose + verificación de punta a punta

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: `docker compose up` levanta `api` (puerto 4000, volumen persistente) y `web` (puerto 8080, apunta a `api` vía `VITE_API_URL`).

- [ ] **Step 1: Escribir `docker-compose.yml`**

```yaml
services:
  api:
    build: ./backend
    ports:
      - "4000:4000"
    volumes:
      - fiado_data:/app/data
    restart: unless-stopped

  web:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:4000}
    ports:
      - "8080:8080"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  fiado_data:
```

- [ ] **Step 2: Levantar y verificar**

Run: `docker compose up -d --build`
Expected: ambos servicios arrancan sin errores.

Run: `curl -s http://localhost:4000/api/resumen` → JSON válido.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/` → `200`.

- [ ] **Step 3: Verificación manual de punta a punta**

Abrir `http://localhost:8080` en el navegador (no disponible desde este entorno de ejecución — lo hace quien ejecuta el plan): crear cliente, fiar, abonar, cerrar caja, revisar Resumen y Reportes. Confirmar layout de escritorio (barra lateral) y, redimensionando a ancho de celular, el layout con navegación inferior sin scroll horizontal.

- [ ] **Step 4: Verificar persistencia**

Run: `docker compose restart`
Run: `curl -s http://localhost:4000/api/clientes` → confirma que los clientes creados en el Step 3 siguen ahí (el volumen `fiado_data` persiste).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: docker-compose para api y web"
```

---

### Task 16: Retirar los archivos de v1

**Files:**
- Delete: `logic.js`, `app.js`, `index.html`, `manifest.json`, `sw.js`, `test.js`, `icon.svg` (raíz del proyecto)

**Interfaces:** (ninguna — son los 7 archivos estáticos que la v1 dejó en la raíz, ya sin rol una vez `backend/` y `frontend/` están verificados)

- [ ] **Step 1: Confirmar que el sistema nuevo funciona de punta a punta**

Repetir la verificación manual de la Task 15, Step 3, si no se hizo ya en esta sesión.

- [ ] **Step 2: Eliminar los archivos de v1**

```bash
git rm logic.js app.js index.html manifest.json sw.js test.js icon.svg
```

- [ ] **Step 3: Confirmar que nada quedó roto**

Run: `docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/`
Expected: `200` (el frontend nuevo no depende de ningún archivo de la raíz).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: retirar los archivos estáticos de v1, reemplazados por backend/ y frontend/"
```

---

## Self-Review

**Cobertura del spec:** arquitectura (Task 1-16), modelo de datos (Task 1), API REST completa (Tasks 3-6), frontend con las 5 pantallas (Tasks 9-13), Docker (Tasks 7, 14, 15), manejo de errores (Toast en Task 9, validación backend en Tasks 3-6), testing backend (Tasks 1-6), migración desde v1 (Task 16). Sin login: no hay tarea de autenticación, correcto. Sin testing de componentes React: correcto, solo verificación manual.

**Placeholders:** ninguno — cada step de código trae el archivo completo o el fragmento exacto a insertar, con su ancla.

**Consistencia de tipos:** `clienteId`/`tipo`/`monto`/`fecha` se usan consistentemente en `logic.js`, `db.js` (mapeados desde `cliente_id`), las rutas y `frontend/src/api.js`. `queries.*` nombrados igual en `db.js` y en cada archivo de rutas que los consume.
