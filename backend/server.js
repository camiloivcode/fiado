import express from 'express';
import cors from 'cors';
import clientesRouter from './routes/clientes.js';
import movimientosRouter from './routes/movimientos.js';
import cajaRouter from './routes/caja.js';
import resumenRouter from './routes/resumen.js';
import reportesRouter from './routes/reportes.js';

export function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/clientes', clientesRouter);
  app.use('/api/movimientos', movimientosRouter);
  app.use('/api/caja', cajaRouter);
  app.use('/api/resumen', resumenRouter);
  app.use('/api/reportes', reportesRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = crearApp();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API escuchando en :${PORT}`));
}
