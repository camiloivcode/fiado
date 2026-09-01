import express from 'express';
import cors from 'cors';
import { inicializarDB } from './db.js';
import { requerirAuth } from './auth.js';
import authRouter from './routes/auth.js';
import clientesRouter from './routes/clientes.js';
import movimientosRouter from './routes/movimientos.js';
import cajaRouter from './routes/caja.js';
import resumenRouter from './routes/resumen.js';
import reportesRouter from './routes/reportes.js';

const ORIGENES_POR_DEFECTO = ['https://localhost', 'capacitor://localhost', 'http://localhost:5173'];
const origenesPermitidos = process.env.ORIGENES_PERMITIDOS
  ? process.env.ORIGENES_PERMITIDOS.split(',').map((o) => o.trim())
  : ORIGENES_POR_DEFECTO;

export function crearApp() {
  const app = express();
  app.set('trust proxy', 1); // Render corre detrás de un proxy; req.ip debe ser el real, no el del proxy
  app.use(cors({ origin: (origen, cb) => cb(null, !origen || origenesPermitidos.includes(origen)) }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);

  app.use('/api/clientes', requerirAuth, clientesRouter);
  app.use('/api/movimientos', requerirAuth, movimientosRouter);
  app.use('/api/caja', requerirAuth, cajaRouter);
  app.use('/api/resumen', requerirAuth, resumenRouter);
  app.use('/api/reportes', requerirAuth, reportesRouter);

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
  await inicializarDB();
  const app = crearApp();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API escuchando en :${PORT}`));
}
