import { queries, generarId, ahoraISO, inicializarDB, pool } from './db.js';
import { hashClave } from './auth.js';

const [email, nombre, clave] = process.argv.slice(2);

if (!email || !nombre || !clave) {
  console.error('Uso: node crear-usuario.js <correo> <nombre> <clave>');
  process.exit(1);
}
if (clave.length < 8) {
  console.error('La clave debe tener al menos 8 caracteres');
  process.exit(1);
}

await inicializarDB();

const emailNormalizado = email.trim().toLowerCase();
const existente = await queries.buscarUsuarioPorEmail.get(emailNormalizado);
if (existente) {
  console.error(`Ya existe un usuario con el correo ${emailNormalizado}`);
  process.exit(1);
}

const claveHash = await hashClave(clave);
await queries.crearUsuario.run(generarId(), emailNormalizado, nombre.trim(), claveHash, ahoraISO());

console.log(`Usuario creado: ${emailNormalizado}`);
await pool.end();
