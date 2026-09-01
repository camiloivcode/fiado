import { Router } from 'express';
import { queries, generarId, ahoraISO } from '../db.js';
import { validarMonto, parsearMonto } from '../logic.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.get('/', asincrono(async (req, res) => {
  res.json(await queries.listarCaja.all());
}));

router.post('/', asincrono(async (req, res) => {
  if (!validarMonto(req.body.monto)) {
    return res.status(400).json({ error: 'Ingresa un monto válido, mayor a cero' });
  }
  const montoNum = parsearMonto(req.body.monto);
  const nota = typeof req.body.nota === 'string' ? req.body.nota.trim() : '';
  const cierre = { id: generarId(), fecha: ahoraISO(), monto: montoNum, nota };
  await queries.crearCaja.run(cierre.id, cierre.fecha, cierre.monto, cierre.nota);
  res.status(201).json(cierre);
}));

router.patch('/:id', asincrono(async (req, res) => {
  const cierre = await queries.buscarCaja.get(req.params.id);
  if (!cierre) return res.status(404).json({ error: 'Cierre no encontrado' });
  if (!validarMonto(req.body.monto)) {
    return res.status(400).json({ error: 'Ingresa un monto válido, mayor a cero' });
  }
  const montoNum = parsearMonto(req.body.monto);
  const nota = typeof req.body.nota === 'string' ? req.body.nota.trim() : '';
  await queries.actualizarCaja.run(montoNum, nota, req.params.id);
  res.json({ id: cierre.id, fecha: cierre.fecha, monto: montoNum, nota });
}));

router.delete('/:id', asincrono(async (req, res) => {
  const cierre = await queries.buscarCaja.get(req.params.id);
  if (!cierre) return res.status(404).json({ error: 'Cierre no encontrado' });
  await queries.eliminarCaja.run(req.params.id);
  res.status(204).end();
}));

export default router;
