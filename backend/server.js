import express from 'express';
import cors from 'cors';
import clientesRouter from './routes/clientes.js';
import movimientosRouter from './routes/movimientos.js';

export function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/clientes', clientesRouter);
  app.use('/api/movimientos', movimientosRouter);

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
