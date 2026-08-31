import { Router } from 'express';
import { queries, mapMovimiento } from '../db.js';
import { saldoCliente, totalFiado, diaLocal } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const clientes = queries.listarClientes.all();
  const movimientos = queries.listarMovimientos.all().map(mapMovimiento);
  const clientesConSaldo = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: saldoCliente(c.id, movimientos),
  }));
  const hoy = diaLocal(new Date().toISOString());
  const cajaHoy = queries.listarCaja.all().filter((c) => diaLocal(c.fecha) === hoy);
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
