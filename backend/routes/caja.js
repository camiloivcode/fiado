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
  const nota = typeof req.body.nota === 'string' ? req.body.nota.trim() : '';
  const cierre = { id: generarId(), fecha: ahoraISO(), monto: montoNum, nota };
  queries.crearCaja.run(cierre.id, cierre.fecha, cierre.monto, cierre.nota);
  res.status(201).json(cierre);
});

export default router;
