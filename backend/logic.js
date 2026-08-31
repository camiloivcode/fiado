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

export function ultimaActividad(clienteId, movimientos) {
  const propios = movimientos.filter((m) => m.clienteId === clienteId);
  if (!propios.length) return null;
  return propios.reduce((max, m) => (m.fecha > max ? m.fecha : max), propios[0].fecha);
}

export function diasDesde(fechaISO, ahora = new Date()) {
  return Math.floor((ahora.getTime() - new Date(fechaISO).getTime()) / 86_400_000);
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

// Cota superior exclusiva (UTC) del día local `diaISO`: cualquier fecha < este valor
// pertenece a ese día local o a uno anterior. Mismo cálculo de frontera que reportes.js.
export function finDiaLocalISO(diaISO) {
  const siguiente = new Date(`${diaISO}T00:00:00.000Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  const horaInicio = String(OFFSET_HORAS_BOGOTA).padStart(2, '0');
  return `${siguiente.toISOString().slice(0, 10)}T${horaInicio}:00:00.000Z`;
}

export function ultimosDiasLocales(n, ahora = new Date()) {
  const hoy = diaLocal(ahora.toISOString());
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(`${hoy}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}
