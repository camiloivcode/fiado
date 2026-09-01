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
      telefono: c.telefono,
      saldo: saldoCliente(c.id, movimientos),
      ultimaActividad: ultimaActividad(c.id, movimientos),
    }))
  );
}));

router.post('/', asincrono(async (req, res) => {
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const cliente = { id: generarId(), nombre, telefono: '', creadoEn: ahoraISO() };
  await queries.crearCliente.run(cliente.id, cliente.nombre, cliente.telefono, cliente.creadoEn);
  res.status(201).json({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, saldo: 0 });
}));

router.patch('/:id', asincrono(async (req, res) => {
  const cliente = await queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  await queries.actualizarCliente.run(nombre, req.params.id);
  res.json({ id: cliente.id, nombre, telefono: cliente.telefono });
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
