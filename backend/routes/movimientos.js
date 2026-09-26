import { Router } from 'express';
import { queries, generarId, ahoraISO } from '../db.js';
import { validarMonto, parsearMonto } from '../logic.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.post('/', asincrono(async (req, res) => {
  const { clienteId, tipo, monto } = req.body;
  if (tipo !== 'fiado' && tipo !== 'abono') {
    return res.status(400).json({ error: "tipo debe ser 'fiado' o 'abono'" });
  }
  if (typeof clienteId !== 'string' || !clienteId) {
    return res.status(400).json({ error: 'clienteId es obligatorio' });
  }
  const cliente = await queries.buscarCliente.get(clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  if (!validarMonto(monto)) {
    return res.status(400).json({ error: 'Ingresa un monto válido, mayor a cero' });
  }
  const montoNum = parsearMonto(monto);
  const descripcion = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim().slice(0, 300) : '';
  const mov = { id: generarId(), clienteId, tipo, monto: montoNum, descripcion, fecha: ahoraISO() };
  await queries.crearMovimiento.run(mov.id, mov.clienteId, mov.tipo, mov.monto, mov.descripcion, mov.fecha);
  res.status(201).json(mov);
}));

router.delete('/:id', asincrono(async (req, res) => {
  const mov = await queries.buscarMovimiento.get(req.params.id);
  if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
  await queries.eliminarMovimiento.run(req.params.id);
  res.status(204).end();
}));

export default router;
