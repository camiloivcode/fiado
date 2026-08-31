import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';
import { saldoCliente, totalFiado } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const clientes = queries.listarClientes.all();
  const movimientos = queries.listarMovimientos.all().map(mapMovimiento);
  const clientesConSaldo = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: saldoCliente(c.id, movimientos),
  }));
  const hoy = new Date().toISOString().slice(0, 10);
  const cajaHoy = queries.listarCaja.all().filter((c) => c.fecha.slice(0, 10) === hoy);
  const topDeudores = clientesConSaldo
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  res.json({
    totalFiado: totalFiado(clientes, movimientos),
    clientesConDeuda: clientesConSaldo.filter((c) => c.saldo > 0).length,
    cajaHoy: cajaHoy.reduce((acc, c) => acc + c.monto, 0),
    topDeudores,
  });
});

export default router;
