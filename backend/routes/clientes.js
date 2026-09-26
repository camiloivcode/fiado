import { Router } from 'express';
import { queries, mapMovimiento, generarId, ahoraISO } from '../db.js';
import { saldoCliente, ultimaActividad } from '../logic.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.get('/', asincrono(async (req, res) => {
  const clientes = await queries.listarClientes.all();
  const movimientos = (await queries.listarMovimientos.all()).map(mapMovimiento);
  res.json(
    clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono || '',
      limiteCredito: Number(c.limite_credito) || 0,
      saldo: saldoCliente(c.id, movimientos),
      ultimaActividad: ultimaActividad(c.id, movimientos),
    }))
  );
}));

router.post('/', asincrono(async (req, res) => {
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const telefono = typeof req.body.telefono === 'string' ? req.body.telefono.trim() : '';
  const limiteCredito = typeof req.body.limiteCredito === 'number' && req.body.limiteCredito >= 0 ? Math.floor(req.body.limiteCredito) : 0;
  const cliente = { id: generarId(), nombre, telefono, limiteCredito, creadoEn: ahoraISO() };
  await queries.crearCliente.run(cliente.id, cliente.nombre, cliente.telefono, cliente.limiteCredito, cliente.creadoEn);
  res.status(201).json({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, limiteCredito: cliente.limiteCredito, saldo: 0 });
}));

router.patch('/:id', asincrono(async (req, res) => {
  const cliente = await queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : cliente.nombre;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const telefono = typeof req.body.telefono === 'string' ? req.body.telefono.trim() : (cliente.telefono || '');
  const limiteCredito = typeof req.body.limiteCredito === 'number' && req.body.limiteCredito >= 0
    ? Math.floor(req.body.limiteCredito)
    : (Number(cliente.limite_credito) || 0);
  await queries.actualizarCliente.run(nombre, telefono, limiteCredito, req.params.id);
  res.json({ id: cliente.id, nombre, telefono, limiteCredito });
}));

router.get('/:id/movimientos', asincrono(async (req, res) => {
  const cliente = await queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json((await queries.movimientosDeCliente.all(req.params.id)).map(mapMovimiento));
}));

router.delete('/:id', asincrono(async (req, res) => {
  const cliente = await queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  await queries.eliminarCliente.run(req.params.id);
  res.status(204).end();
}));

export default router;
