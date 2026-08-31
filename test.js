import { strict as assert } from 'node:assert';
import {
  validarMonto,
  parsearMonto,
  formatearPesos,
  saldoCliente,
  totalFiado,
  ordenarPorFechaDesc,
} from './logic.js';

// validarMonto
assert.equal(validarMonto(12500), true);
assert.equal(validarMonto(0), false);
assert.equal(validarMonto(-100), false);
assert.equal(validarMonto('abc'), false);
assert.equal(validarMonto(NaN), false);
assert.equal(validarMonto(1.5), false);

// parsearMonto
assert.equal(parsearMonto('12500'), 12500);
assert.equal(parsearMonto('12500.9'), 12500);

// formatearPesos
assert.equal(formatearPesos(12500).includes('12.500'), true);

// saldoCliente: fiados menos abonos
const movimientos = [
  { clienteId: 'a', tipo: 'fiado', monto: 12500 },
  { clienteId: 'a', tipo: 'fiado', monto: 3000 },
  { clienteId: 'a', tipo: 'abono', monto: 10000 },
  { clienteId: 'b', tipo: 'fiado', monto: 5000 },
];
assert.equal(saldoCliente('a', movimientos), 5500);
assert.equal(saldoCliente('b', movimientos), 5000);
assert.equal(saldoCliente('c', movimientos), 0);

// saldo a favor (abono mayor al fiado, permitido y negativo)
const conAbonoDeMas = [
  { clienteId: 'a', tipo: 'fiado', monto: 5000 },
  { clienteId: 'a', tipo: 'abono', monto: 8000 },
];
assert.equal(saldoCliente('a', conAbonoDeMas), -3000);

// totalFiado suma el saldo de todos los clientes
const clientes = [{ id: 'a' }, { id: 'b' }];
assert.equal(totalFiado(clientes, movimientos), 10500);

// ordenarPorFechaDesc: más reciente primero
const items = [
  { fecha: '2026-01-01T10:00:00.000Z' },
  { fecha: '2026-01-03T10:00:00.000Z' },
  { fecha: '2026-01-02T10:00:00.000Z' },
];
const ordenados = ordenarPorFechaDesc(items);
assert.deepEqual(
  ordenados.map((i) => i.fecha),
  ['2026-01-03T10:00:00.000Z', '2026-01-02T10:00:00.000Z', '2026-01-01T10:00:00.000Z']
);

console.log('OK: todas las pruebas pasaron');
