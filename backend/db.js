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
