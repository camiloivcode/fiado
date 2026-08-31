import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fiado-test-'));
process.env.NODE_ENV = 'test';

const { queries, generarId, ahoraISO } = await import('./db.js');
import {
  validarMonto,
  parsearMonto,
  formatearPesos,
  saldoCliente,
  totalFiado,
  ordenarPorFechaDesc,
  diaLocal,
  ultimaActividad,
  diasDesde,
  finDiaLocalISO,
  ultimosDiasLocales,
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

// diaLocal: bucketing por día en hora de Bogotá (UTC-5, sin horario de verano)
// 23:30 UTC == 18:30 local, sigue siendo el mismo día local
assert.equal(diaLocal('2026-08-31T23:30:00.000Z'), '2026-08-31');
// 02:00 UTC del 1-sep == 21:00 local del 31-ago, día local anterior
assert.equal(diaLocal('2026-09-01T02:00:00.000Z'), '2026-08-31');

// ultimaActividad / diasDesde: para la alerta de deuda vieja
assert.equal(ultimaActividad('sin-movs', movsPrueba.map((m) => ({ ...m, fecha: '2026-01-01T00:00:00.000Z' }))), null);
const movsConFecha = [
  { clienteId: 'a', tipo: 'fiado', monto: 1000, fecha: '2026-01-01T00:00:00.000Z' },
  { clienteId: 'a', tipo: 'abono', monto: 200, fecha: '2026-02-15T00:00:00.000Z' },
];
assert.equal(ultimaActividad('a', movsConFecha), '2026-02-15T00:00:00.000Z');
assert.equal(diasDesde('2026-08-01T00:00:00.000Z', new Date('2026-08-31T00:00:00.000Z')), 30);

// finDiaLocalISO / ultimosDiasLocales: frontera de días para las tendencias de 7 días
assert.equal(finDiaLocalISO('2026-08-31'), '2026-09-01T05:00:00.000Z');
assert.ok('2026-08-31T23:30:00.000Z' < finDiaLocalISO('2026-08-31')); // sigue siendo del 31 local
assert.ok('2026-09-01T05:00:00.000Z' >= finDiaLocalISO('2026-08-31')); // ya es del 1-sep local

const dias7 = ultimosDiasLocales(7, new Date('2026-08-31T20:00:00.000Z'));
assert.equal(dias7.length, 7);
assert.equal(dias7.at(-1), '2026-08-31');
assert.equal(dias7[0], '2026-08-25');

// --- servidor de pruebas ---
const { crearApp } = await import('./server.js');
const app = crearApp();
const servidor = app.listen(0);
const base = `http://localhost:${servidor.address().port}`;

// --- /api/health ---
let respuesta = await fetch(`${base}/api/health`);
assert.equal(respuesta.status, 200);
assert.deepEqual(await respuesta.json(), { ok: true });

// --- rutas /api/clientes ---
respuesta = await fetch(`${base}/api/clientes`);
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

respuesta = await fetch(`${base}/api/clientes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 12345 }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}/movimientos`);
assert.equal(respuesta.status, 200);
assert.deepEqual(await respuesta.json(), []);

respuesta = await fetch(`${base}/api/clientes/no-existe/movimientos`);
assert.equal(respuesta.status, 404);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'Don Pedro Editado' }),
});
assert.equal(respuesta.status, 200);
assert.equal((await respuesta.json()).nombre, 'Don Pedro Editado');

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: '' }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/clientes/no-existe`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'X' }),
});
assert.equal(respuesta.status, 404);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 204);

respuesta = await fetch(`${base}/api/clientes/${donPedro.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 404);

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

// monto con notación decimal/separador de miles (ej. "12.500") debe rechazarse ANTES de truncar,
// no aceptarse silenciosamente como 12
respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clienteId: donaMarta.id, tipo: 'fiado', monto: '12.500' }),
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
assert.equal(typeof martaConSaldo.ultimaActividad, 'string'); // tiene movimientos: fecha ISO

respuesta = await fetch(`${base}/api/movimientos/${fiado1.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 204);

respuesta = await fetch(`${base}/api/clientes`);
const listaTrasBorrar = (await respuesta.json()).find((c) => c.id === donaMarta.id);
assert.equal(listaTrasBorrar.saldo, -5000);

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/movimientos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tipo: 'fiado', monto: 1000 }),
});
assert.equal(respuesta.status, 400);

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

// mismo caso que arriba pero para /api/caja: no truncar antes de validar
respuesta = await fetch(`${base}/api/caja`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: '12.500', nota: '' }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/caja`);
const historialCaja = await respuesta.json();
assert.equal(historialCaja.length, 1);
assert.equal(historialCaja[0].monto, 250000);

respuesta = await fetch(`${base}/api/caja`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 1000, nota: 12345 }),
});
assert.equal(respuesta.status, 201);
const cajaConNotaNum = await respuesta.json();
assert.equal(cajaConNotaNum.nota, '');

respuesta = await fetch(`${base}/api/caja/${cajaConNotaNum.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 5000, nota: 'corregido' }),
});
assert.equal(respuesta.status, 200);
const cajaEditada = await respuesta.json();
assert.equal(cajaEditada.monto, 5000);
assert.equal(cajaEditada.nota, 'corregido');

respuesta = await fetch(`${base}/api/caja/${cajaConNotaNum.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 0, nota: '' }),
});
assert.equal(respuesta.status, 400);

respuesta = await fetch(`${base}/api/caja/no-existe`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 1000, nota: '' }),
});
assert.equal(respuesta.status, 404);

respuesta = await fetch(`${base}/api/caja/${cajaConNotaNum.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 204);

respuesta = await fetch(`${base}/api/caja/${cajaConNotaNum.id}`, { method: 'DELETE' });
assert.equal(respuesta.status, 404);

// --- rutas /api/resumen y /api/reportes ---
respuesta = await fetch(`${base}/api/resumen`);
assert.equal(respuesta.status, 200);
const resumen = await respuesta.json();
assert.equal(typeof resumen.totalFiado, 'number');
assert.ok(resumen.topDeudores.length <= 5);
assert.equal(resumen.tendencias.totalFiado.length, 7);
assert.equal(resumen.tendencias.clientesConDeuda.length, 7);
assert.equal(resumen.tendencias.cajaHoy.length, 7);
// el último punto de la tendencia (hoy) debe coincidir con los totales actuales
assert.equal(resumen.tendencias.totalFiado.at(-1), resumen.totalFiado);
assert.equal(resumen.tendencias.clientesConDeuda.at(-1), resumen.clientesConDeuda);
assert.equal(resumen.tendencias.cajaHoy.at(-1), resumen.cajaHoy);

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

servidor.close();

console.log('OK: todas las pruebas pasaron');
