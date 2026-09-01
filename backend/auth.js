import crypto from 'node:crypto';
import { pool, ahoraISO } from './db.js';

const DIAS_SESION = 30;

function scrypt(clave, sal) {
  return new Promise((resolver, rechazar) => {
    crypto.scrypt(clave, sal, 64, (error, derivada) => {
      if (error) rechazar(error);
      else resolver(derivada.toString('hex'));
    });
  });
}

export async function hashClave(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  const derivada = await scrypt(clave, sal);
  return `${sal}:${derivada}`;
}

export async function verificarClave(clave, claveHash) {
  const [sal, derivadaGuardada] = claveHash.split(':');
  const derivada = await scrypt(clave, sal);
  const a = Buffer.from(derivada, 'hex');
  const b = Buffer.from(derivadaGuardada, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function crearSesion(usuarioId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + DIAS_SESION * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO sesiones (token_hash, usuario_id, creado_en, expira_en) VALUES ($1, $2, $3, $4)',
    [hashToken(token), usuarioId, ahora.toISOString(), expira.toISOString()]
  );
  return token;
}

export async function borrarSesion(token) {
  await pool.query('DELETE FROM sesiones WHERE token_hash = $1', [hashToken(token)]);
}

export async function usuarioDeSesion(token) {
  const { rows } = await pool.query(
    `SELECT u.id, u.nombre, u.email FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1 AND s.expira_en > $2`,
    [hashToken(token), ahoraISO()]
  );
  return rows[0] ?? null;
}

export async function requerirAuth(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sesión requerida' });
  const usuario = await usuarioDeSesion(token);
  if (!usuario) return res.status(401).json({ error: 'Sesión expirada' });
  req.usuario = usuario;
  next();
}

// ponytail: contador de intentos en memoria — sirve porque el API corre en una sola
// instancia (Render free). Si se escala a más de una, mover a la tabla sesiones o a un
// store compartido.
const intentosLogin = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

export function limitarIntentosLogin(req, res, next) {
  const ip = req.ip;
  const ahora = Date.now();
  const registro = intentosLogin.get(ip);
  if (registro && ahora - registro.desde < VENTANA_MS) {
    if (registro.cantidad >= MAX_INTENTOS) {
      return res.status(429).json({ error: 'Demasiados intentos, espera unos minutos' });
    }
    registro.cantidad += 1;
  } else {
    intentosLogin.set(ip, { desde: ahora, cantidad: 1 });
  }
  next();
}
