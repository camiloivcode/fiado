import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Los parámetros desde y hasta son obligatorios (YYYY-MM-DD)' });
  }
  const desdeISO = `${desde}T00:00:00.000Z`;
  const hastaISO = `${hasta}T23:59:59.999Z`;

  const movimientos = queries.movimientosEnRango.all(desdeISO, hastaISO).map(mapMovimiento);
  const cajas = queries.cajaEnRango.all(desdeISO, hastaISO);

  const porDia = {};
  for (const m of movimientos) {
    const dia = m.fecha.slice(0, 10);
    porDia[dia] ??= { dia, fiado: 0, abono: 0 };
    porDia[dia][m.tipo] += m.monto;
  }

  res.json({
    movimientos,
    caja: cajas,
    porDia: Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)),
  });
});

export default router;
