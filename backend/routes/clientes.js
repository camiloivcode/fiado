import { Router } from 'express';
import { queries, mapMovimiento, generarId, ahoraISO } from '../db.js';
import { saldoCliente } from '../logic.js';

const router = Router();

router.get('/', (req, res) => {
  const clientes = queries.listarClientes.all();
  const movimientos = queries.listarMovimientos.all().map(mapMovimiento);
  res.json(
    clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      saldo: saldoCliente(c.id, movimientos),
    }))
  );
});

router.post('/', (req, res) => {
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const cliente = { id: generarId(), nombre, telefono: '', creadoEn: ahoraISO() };
  queries.crearCliente.run(cliente.id, cliente.nombre, cliente.telefono, cliente.creadoEn);
  res.status(201).json({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, saldo: 0 });
});

router.get('/:id/movimientos', (req, res) => {
  const cliente = queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(queries.movimientosDeCliente.all(req.params.id).map(mapMovimiento));
});

router.delete('/:id', (req, res) => {
  const cliente = queries.buscarCliente.get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  queries.eliminarCliente.run(req.params.id);
  res.status(204).end();
});

export default router;
