const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Error inesperado');
  return datos;
}

export const api = {
  listarClientes: () => solicitar('/api/clientes'),
  crearCliente: (nombre) => solicitar('/api/clientes', { method: 'POST', body: JSON.stringify({ nombre }) }),
  eliminarCliente: (id) => solicitar(`/api/clientes/${id}`, { method: 'DELETE' }),
  movimientosDeCliente: (id) => solicitar(`/api/clientes/${id}/movimientos`),
  crearMovimiento: (clienteId, tipo, monto) =>
    solicitar('/api/movimientos', { method: 'POST', body: JSON.stringify({ clienteId, tipo, monto }) }),
  eliminarMovimiento: (id) => solicitar(`/api/movimientos/${id}`, { method: 'DELETE' }),
  listarCaja: () => solicitar('/api/caja'),
  cerrarCaja: (monto, nota) => solicitar('/api/caja', { method: 'POST', body: JSON.stringify({ monto, nota }) }),
  resumen: () => solicitar('/api/resumen'),
  reportes: (desde, hasta) => solicitar(`/api/reportes?desde=${desde}&hasta=${hasta}`),
};
