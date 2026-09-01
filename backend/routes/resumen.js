import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';
import { saldoCliente, totalFiado, diaLocal, ultimosDiasLocales, finDiaLocalISO } from '../logic.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.get('/', asincrono(async (req, res) => {
  const clientes = await queries.listarClientes.all();
  const movimientos = (await queries.listarMovimientos.all()).map(mapMovimiento);
  const cajas = await queries.listarCaja.all();
  const clientesConSaldo = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: saldoCliente(c.id, movimientos),
  }));
  const hoy = diaLocal(new Date().toISOString());
  const cajaHoy = cajas.filter((c) => diaLocal(c.fecha) === hoy);
  const topDeudores = clientesConSaldo
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  // tendencia real de 7 días para los mini-gráficos de las tarjetas: se reconstruye
  // el saldo de cada cliente al cierre de cada día a partir del historial completo.
  const dias = ultimosDiasLocales(7);
  const totalFiadoTendencia = [];
  const clientesConDeudaTendencia = [];
  const cajaHoyTendencia = [];
  for (const dia of dias) {
    const cota = finDiaLocalISO(dia);
    const movsHastaDia = movimientos.filter((m) => m.fecha < cota);
    const saldosDia = clientes.map((c) => saldoCliente(c.id, movsHastaDia));
    totalFiadoTendencia.push(saldosDia.reduce((acc, s) => acc + s, 0));
    clientesConDeudaTendencia.push(saldosDia.filter((s) => s > 0).length);
    cajaHoyTendencia.push(
      cajas.filter((c) => diaLocal(c.fecha) === dia).reduce((acc, c) => acc + c.monto, 0)
    );
  }

  res.json({
    totalFiado: totalFiado(clientes, movimientos),
    clientesConDeuda: clientesConSaldo.filter((c) => c.saldo > 0).length,
    cajaHoy: cajaHoy.reduce((acc, c) => acc + c.monto, 0),
    topDeudores,
    tendencias: {
      totalFiado: totalFiadoTendencia,
      clientesConDeuda: clientesConDeudaTendencia,
      cajaHoy: cajaHoyTendencia,
    },
  });
}));

export default router;
