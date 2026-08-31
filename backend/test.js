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
