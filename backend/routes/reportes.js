import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';
import { diaLocal, OFFSET_HORAS_BOGOTA } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Los parámetros desde y hasta son obligatorios (YYYY-MM-DD)' });
  }
  // El día local (Bogotá, UTC-{OFFSET_HORAS_BOGOTA}) empieza a las {OFFSET_HORAS_BOGOTA}:00 UTC
  // y termina a las ({OFFSET_HORAS_BOGOTA}-1):59:59.999 UTC del día siguiente.
  const horaInicio = String(OFFSET_HORAS_BOGOTA).padStart(2, '0');
  const horaFin = String(OFFSET_HORAS_BOGOTA - 1).padStart(2, '0');
  const hastaMasUnDia = new Date(`${hasta}T00:00:00.000Z`);
  hastaMasUnDia.setUTCDate(hastaMasUnDia.getUTCDate() + 1);
  const desdeISO = `${desde}T${horaInicio}:00:00.000Z`;
  const hastaISO = `${hastaMasUnDia.toISOString().slice(0, 10)}T${horaFin}:59:59.999Z`;

  const movimientos = queries.movimientosEnRango.all(desdeISO, hastaISO).map(mapMovimiento);
  const cajas = queries.cajaEnRango.all(desdeISO, hastaISO);

  const porDia = {};
  for (const m of movimientos) {
    const dia = diaLocal(m.fecha);
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
