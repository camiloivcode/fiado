export function validarMonto(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export function parsearMonto(valor) {
  return Math.trunc(Number(valor));
}

export function formatearPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function saldoCliente(clienteId, movimientos) {
  return movimientos
    .filter((m) => m.clienteId === clienteId)
    .reduce((acc, m) => acc + (m.tipo === 'fiado' ? m.monto : -m.monto), 0);
}

export function totalFiado(clientes, movimientos) {
  return clientes.reduce((acc, c) => acc + saldoCliente(c.id, movimientos), 0);
}

export function ordenarPorFechaDesc(items) {
  return [...items].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ponytail: America/Bogota es UTC-5 fijo (sin horario de verano). Si se despliega en otra zona horaria, parametrizar este offset.
export const OFFSET_HORAS_BOGOTA = 5;

export function diaLocal(fechaISO) {
  const conOffset = new Date(new Date(fechaISO).getTime() - OFFSET_HORAS_BOGOTA * 3600 * 1000);
  return conOffset.toISOString().slice(0, 10);
}
