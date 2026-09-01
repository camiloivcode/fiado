import { Router } from 'express';
import { queries } from '../db.js';
import { verificarClave, crearSesion, borrarSesion, usuarioDeSesion, limitarIntentosLogin } from '../auth.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.post('/login', limitarIntentosLogin, asincrono(async (req, res) => {
  const { email, clave } = req.body;
  if (typeof email !== 'string' || typeof clave !== 'string' || !email || !clave) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  const usuario = await queries.buscarUsuarioPorEmail.get(email.trim().toLowerCase());
  if (!usuario || !(await verificarClave(clave, usuario.clave_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  const token = await crearSesion(usuario.id);
  res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
}));

router.post('/logout', asincrono(async (req, res) => {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  if (token) await borrarSesion(token);
  res.status(204).end();
}));

router.get('/yo', asincrono(async (req, res) => {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  const usuario = token ? await usuarioDeSesion(token) : null;
  if (!usuario) return res.status(401).json({ error: 'Sesión expirada' });
  res.json(usuario);
}));

export default router;
