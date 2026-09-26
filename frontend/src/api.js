import { leerToken, borrarToken } from './sesion.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function solicitar(ruta, opciones = {}) {
  const token = leerToken();
  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opciones,
  });
  if (respuesta.status === 401 && token) {
    // la sesión murió (expiró o se revocó desde otro dispositivo): vuelve al login
    borrarToken();
    location.reload();
    return new Promise(() => {}); // corta la cadena; la recarga ya viene en camino
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Error inesperado');
  return datos;
}

export const api = {
  salud: () => solicitar('/api/health'),
  estadoAuth: () => solicitar('/api/auth/estado'),
  setupAuth: (email, nombre, clave) =>
    solicitar('/api/auth/setup', { method: 'POST', body: JSON.stringify({ email, nombre, clave }) }),
  login: (email, clave) => solicitar('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, clave }) }),
  logout: () => solicitar('/api/auth/logout', { method: 'POST' }),
  yo: () => solicitar('/api/auth/yo'),
  perfil: () => solicitar('/api/auth/perfil'),
  actualizarPerfil: (datos) => solicitar('/api/auth/perfil', { method: 'PATCH', body: JSON.stringify(datos) }),
  listarClientes: () => solicitar('/api/clientes'),
  crearCliente: (nombre, telefono = '', limiteCredito = 0) =>
    solicitar('/api/clientes', { method: 'POST', body: JSON.stringify({ nombre, telefono, limiteCredito }) }),
  editarCliente: (id, nombre, telefono, limiteCredito) =>
    solicitar(`/api/clientes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        nombre,
        ...(telefono !== undefined ? { telefono } : {}),
        ...(limiteCredito !== undefined ? { limiteCredito } : {}),
      }),
    }),
  eliminarCliente: (id) => solicitar(`/api/clientes/${id}`, { method: 'DELETE' }),
  movimientosDeCliente: (id) => solicitar(`/api/clientes/${id}/movimientos`),
  crearMovimiento: (clienteId, tipo, monto, descripcion = '') =>
    solicitar('/api/movimientos', { method: 'POST', body: JSON.stringify({ clienteId, tipo, monto, descripcion }) }),
  eliminarMovimiento: (id) => solicitar(`/api/movimientos/${id}`, { method: 'DELETE' }),
  listarCaja: () => solicitar('/api/caja'),
  cerrarCaja: (monto, nota) => solicitar('/api/caja', { method: 'POST', body: JSON.stringify({ monto, nota }) }),
  editarCaja: (id, monto, nota) => solicitar(`/api/caja/${id}`, { method: 'PATCH', body: JSON.stringify({ monto, nota }) }),
  eliminarCaja: (id) => solicitar(`/api/caja/${id}`, { method: 'DELETE' }),
  resumen: () => solicitar('/api/resumen'),
  reportes: (desde, hasta) => solicitar(`/api/reportes?desde=${desde}&hasta=${hasta}`),
};
