import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatoria (postgres://usuario:clave@host:puerto/db)');
}

// ponytail: schema separado por corrida para aislar tests sin tocar la DB compartida.
// En producción PG_SCHEMA queda sin definir y usa el "public" por defecto de Postgres.
const PG_SCHEMA = process.env.PG_SCHEMA || 'public';

const { hostname } = new URL(DATABASE_URL);
const esLocal = hostname === 'localhost' || hostname === '127.0.0.1';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: esLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(PG_SCHEMA !== 'public' ? { options: `-c search_path=${PG_SCHEMA}` } : {}),
});

// En entornos serverless como Neon, las conexiones inactivas pueden suspenderse.
// Escuchar 'error' en el pool evita que caídas de conexiones inactivas provoquen excepciones no controladas.
pool.on('error', (err) => {
  console.error('Aviso en pool Postgres (inactivo):', err.message);
});

export async function inicializarDB() {
  if (PG_SCHEMA !== 'public') {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${PG_SCHEMA}"`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT DEFAULT '',
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('fiado', 'abono')),
      monto INTEGER NOT NULL CHECK (monto > 0),
      fecha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caja (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      monto INTEGER NOT NULL CHECK (monto > 0),
      nota TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      clave_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sesiones (
      token_hash TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      creado_en TEXT NOT NULL,
      expira_en TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ix_movimientos_cliente ON movimientos(cliente_id);
    CREATE INDEX IF NOT EXISTS ix_movimientos_fecha ON movimientos(fecha);
    CREATE INDEX IF NOT EXISTS ix_caja_fecha ON caja(fecha);

    -- Migraciones automáticas idempotentes para bases de datos existentes en Neon
    ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT '';
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito INTEGER DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT DEFAULT '';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nequi TEXT DEFAULT '';
  `);
}

export function generarId() {
  return crypto.randomUUID();
}

export function ahoraISO() {
  return new Date().toISOString();
}

export function mapMovimiento(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    tipo: row.tipo,
    monto: row.monto,
    descripcion: row.descripcion || '',
    fecha: row.fecha,
  };
}

function q(sql) {
  return {
    all: async (...params) => (await pool.query(sql, params)).rows,
    get: async (...params) => (await pool.query(sql, params)).rows[0] ?? null,
    run: async (...params) => {
      await pool.query(sql, params);
    },
  };
}

export const queries = {
  listarClientes: q('SELECT * FROM clientes ORDER BY nombre'),
  crearCliente: q('INSERT INTO clientes (id, nombre, telefono, limite_credito, creado_en) VALUES ($1, $2, $3, $4, $5)'),
  actualizarCliente: q('UPDATE clientes SET nombre = $1, telefono = $2, limite_credito = $3 WHERE id = $4'),
  eliminarCliente: q('DELETE FROM clientes WHERE id = $1'),
  buscarCliente: q('SELECT * FROM clientes WHERE id = $1'),

  listarMovimientos: q('SELECT * FROM movimientos'),
  movimientosDeCliente: q('SELECT * FROM movimientos WHERE cliente_id = $1 ORDER BY fecha DESC'),
  crearMovimiento: q('INSERT INTO movimientos (id, cliente_id, tipo, monto, descripcion, fecha) VALUES ($1, $2, $3, $4, $5, $6)'),
  eliminarMovimiento: q('DELETE FROM movimientos WHERE id = $1'),
  buscarMovimiento: q('SELECT * FROM movimientos WHERE id = $1'),
  movimientosEnRango: q('SELECT * FROM movimientos WHERE fecha >= $1 AND fecha <= $2 ORDER BY fecha'),

  listarCaja: q('SELECT * FROM caja ORDER BY fecha DESC'),
  crearCaja: q('INSERT INTO caja (id, fecha, monto, nota) VALUES ($1, $2, $3, $4)'),
  actualizarCaja: q('UPDATE caja SET monto = $1, nota = $2 WHERE id = $3'),
  eliminarCaja: q('DELETE FROM caja WHERE id = $1'),
  buscarCaja: q('SELECT * FROM caja WHERE id = $1'),
  cajaEnRango: q('SELECT * FROM caja WHERE fecha >= $1 AND fecha <= $2 ORDER BY fecha'),

  buscarUsuarioPorEmail: q('SELECT * FROM usuarios WHERE email = $1'),
  buscarUsuarioPorId: q('SELECT id, email, nombre, telefono, nequi, creado_en FROM usuarios WHERE id = $1'),
  actualizarPerfilUsuario: q('UPDATE usuarios SET nombre = $1, telefono = $2, nequi = $3 WHERE id = $4'),
  crearUsuario: q('INSERT INTO usuarios (id, email, nombre, clave_hash, creado_en) VALUES ($1, $2, $3, $4, $5)'),
  contarUsuarios: q('SELECT COUNT(*)::int AS total FROM usuarios'),
};
