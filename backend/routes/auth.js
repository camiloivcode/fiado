import { Router } from 'express';
import { queries, generarId, ahoraISO } from '../db.js';
import { hashClave, verificarClave, crearSesion, borrarSesion, usuarioDeSesion, limitarIntentosLogin } from '../auth.js';
import { asincrono } from '../asincrono.js';

const router = Router();

router.get('/estado', asincrono(async (req, res) => {
  const count = await queries.contarUsuarios.get();
  res.json({ inicializado: (count?.total ?? 0) > 0 });
}));

router.post('/setup', asincrono(async (req, res) => {
  const count = await queries.contarUsuarios.get();
  if ((count?.total ?? 0) > 0) {
    return res.status(400).json({ error: 'El sistema ya ha sido inicializado' });
  }
  const { email, nombre, clave } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'Ingresa el nombre del administrador o negocio' });
  }
  if (!clave || typeof clave !== 'string' || clave.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const emailNorm = email.trim().toLowerCase();
  const claveHash = await hashClave(clave);
  const nuevoId = generarId();
  await queries.crearUsuario.run(nuevoId, emailNorm, nombre.trim(), claveHash, ahoraISO());

  const token = await crearSesion(nuevoId);
  res.status(201).json({
    token,
    usuario: { id: nuevoId, nombre: nombre.trim(), email: emailNorm },
  });
}));

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
