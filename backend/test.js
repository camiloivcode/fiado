import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fiado-test-'));

const { queries, generarId, ahoraISO } = await import('./db.js');
import {
  validarMonto,
  parsearMonto,
  formatearPesos,
  saldoCliente,
  totalFiado,
  ordenarPorFechaDesc,
} from './logic.js';

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

console.log('OK: todas las pruebas pasaron');
