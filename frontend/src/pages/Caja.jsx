import { useEffect, useState } from 'react';
import { Wallet, Inbox, Pencil, Trash2, Calculator, TrendingUp, Award, PiggyBank, RotateCcw, Check, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import MontoInput from '../components/MontoInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Dinero from '../components/Dinero.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

const DENOMINACIONES = [
  { id: 'b100k', valor: 100000, etiqueta: '$100.000', tipo: 'billete' },
  { id: 'b50k', valor: 50000, etiqueta: '$50.000', tipo: 'billete' },
  { id: 'b20k', valor: 20000, etiqueta: '$20.000', tipo: 'billete' },
  { id: 'b10k', valor: 10000, etiqueta: '$10.000', tipo: 'billete' },
  { id: 'b5k', valor: 5000, etiqueta: '$5.000', tipo: 'billete' },
  { id: 'b2k', valor: 2000, etiqueta: '$2.000', tipo: 'billete' },
  { id: 'm1k', valor: 1000, etiqueta: 'Mon. $1.000', tipo: 'moneda' },
  { id: 'm500', valor: 500, etiqueta: 'Mon. $500', tipo: 'moneda' },
];

export default function Caja() {
  const { mostrarError, mostrarExito } = useToast();
  const [historial, setHistorial] = useState([]);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);
  const [cantidades, setCantidades] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [cajaAEditar, setCajaAEditar] = useState(null);
  const [montoEditado, setMontoEditado] = useState('');
  const [notaEditada, setNotaEditada] = useState('');
  const [cajaABorrar, setCajaABorrar] = useState(null);

  async function cargar() {
    try {
      setHistorial(await api.listarCaja());
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);
  useRefrescarAlEnfocar(cargar);

  // Métricas del mes
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const cierresEsteMes = historial.filter((c) => {
    const f = new Date(c.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const totalMes = cierresEsteMes.reduce((acc, c) => acc + c.monto, 0);
  const promedioMes = cierresEsteMes.length > 0 ? Math.round(totalMes / cierresEsteMes.length) : 0;
  const mejorDia = cierresEsteMes.length > 0 ? Math.max(...cierresEsteMes.map((c) => c.monto)) : 0;

  // Calculadora
  const totalCalculadora = DENOMINACIONES.reduce((acc, d) => {
    const qty = cantidades[d.id] || 0;
    return acc + qty * d.valor;
  }, 0);

  function cambiarCantidad(id, delta) {
    setCantidades((prev) => {
      const actual = prev[id] || 0;
      const nuevo = Math.max(0, actual + delta);
      return { ...prev, [id]: nuevo };
    });
  }

  function limpiarCalculadora() {
    setCantidades({});
  }

  function aplicarCalculadoraACaja() {
    if (totalCalculadora > 0) {
      setMonto(String(totalCalculadora));
      mostrarExito(`Total de $${totalCalculadora.toLocaleString('es-CO')} copiado a caja`);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    const valorNum = Number(monto);
    if (!valorNum && valorNum !== 0) return;
    setGuardando(true);
    try {
      await api.cerrarCaja(valorNum, nota);
      setMonto('');
      setNota('');
      limpiarCalculadora();
      mostrarExito('Cierre del día guardado correctamente');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(cierre) {
    setCajaAEditar(cierre);
    setMontoEditado(String(cierre.monto));
    setNotaEditada(cierre.nota || '');
  }

  async function guardarEdicion(evento) {
    evento.preventDefault();
    try {
      await api.editarCaja(cajaAEditar.id, Number(montoEditado), notaEditada);
      setCajaAEditar(null);
      mostrarExito('Cierre actualizado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function confirmarBorrarCaja() {
    try {
      await api.eliminarCaja(cajaABorrar);
      setCajaABorrar(null);
      mostrarExito('Cierre eliminado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  const fechaHoyFormateada = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="pagina">
      {/* 1. Métricas mensuales */}
      <div className="caja-kpis-grid">
        <div className="caja-kpi-card">
          <div className="caja-kpi-info">
            <span className="caja-kpi-etiqueta">
              <TrendingUp size={14} strokeWidth={2} aria-hidden="true" /> Promedio Diario
            </span>
            <strong className="caja-kpi-valor">{formatearPesos(promedioMes)}</strong>
            <span className="caja-kpi-sub">Mes de {ahora.toLocaleDateString('es-CO', { month: 'long' })}</span>
          </div>
          <div className="caja-kpi-icono" aria-hidden="true">
            <TrendingUp size={18} strokeWidth={2} />
          </div>
        </div>

        <div className="caja-kpi-card">
          <div className="caja-kpi-info">
            <span className="caja-kpi-etiqueta">
              <Award size={14} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--verde)' }} /> Mejor Día del Mes
            </span>
            <strong className="caja-kpi-valor">{formatearPesos(mejorDia)}</strong>
            <span className="caja-kpi-sub">Cierre récord registrado</span>
          </div>
          <div className="caja-kpi-icono" aria-hidden="true" style={{ color: 'var(--verde)' }}>
            <Award size={18} strokeWidth={2} />
          </div>
        </div>

        <div className="caja-kpi-card">
          <div className="caja-kpi-info">
            <span className="caja-kpi-etiqueta">
              <PiggyBank size={14} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--acento)' }} /> Total Recaudado Mes
            </span>
            <strong className="caja-kpi-valor">{formatearPesos(totalMes)}</strong>
            <span className="caja-kpi-sub">{cierresEsteMes.length} {cierresEsteMes.length === 1 ? 'turno cerrado' : 'turnos cerrados'}</span>
          </div>
          <div className="caja-kpi-icono" aria-hidden="true">
            <PiggyBank size={18} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* 2. Formulario de Cierre de Caja del Día */}
      <section className="panel" style={{ borderTop: '3px solid var(--acento)' }}>
        <div className="panel-cabecera" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="marca-icono" aria-hidden="true" style={{ width: 28, height: 28, fontSize: 13 }}>
              <Wallet size={16} strokeWidth={2} />
            </span>
            <div>
              <h3 className="panel-titulo" style={{ margin: 0 }}>Cierre de Caja del Día</h3>
              <span style={{ fontSize: 12, color: 'var(--texto-suave)', textTransform: 'capitalize' }}>
                {fechaHoyFormateada}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => setMostrarCalculadora(!mostrarCalculadora)}
            style={{ fontSize: 13, padding: '6px 12px' }}
          >
            <Calculator size={15} strokeWidth={2} aria-hidden="true" />
            {mostrarCalculadora ? 'Ocultar calculadora' : 'Calculadora de billetes y monedas'}
          </button>
        </div>

        <div className="panel-cuerpo">
          {/* Calculadora interactiva desplegable de denominaciones COP */}
          {mostrarCalculadora && (
            <div className="calculadora-caja">
              <div className="calculadora-cabecera">
                <span className="calculadora-titulo">
                  <Calculator size={16} strokeWidth={2} aria-hidden="true" />
                  Conteo por Billetes y Monedas (COP)
                </span>
                <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                  Toque + o - según los billetes en la gaveta
                </span>
              </div>

              <div className="calculadora-grid">
                {DENOMINACIONES.map((d) => {
                  const cant = cantidades[d.id] || 0;
                  const subtotal = cant * d.valor;
                  return (
                    <div className="calculadora-item" key={d.id}>
                      <span className="calculadora-denominacion">{d.etiqueta}</span>
                      <div className="calculadora-stepper">
                        <button
                          type="button"
                          className="btn-calc-step"
                          onClick={() => cambiarCantidad(d.id, -1)}
                          disabled={cant <= 0}
                          aria-label={`Restar ${d.etiqueta}`}
                        >
                          -
                        </button>
                        <span className="calculadora-cantidad">{cant}</span>
                        <button
                          type="button"
                          className="btn-calc-step"
                          onClick={() => cambiarCantidad(d.id, 1)}
                          aria-label={`Sumar ${d.etiqueta}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="calculadora-subtotal">
                        {subtotal > 0 ? formatearPesos(subtotal) : '$0'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="calculadora-barra-acciones">
                <div className="calculadora-gran-total">
                  Total contado: <strong>{formatearPesos(totalCalculadora)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={limpiarCalculadora}
                    disabled={totalCalculadora === 0}
                    style={{ fontSize: 13, padding: '6px 12px' }}
                  >
                    <RotateCcw size={14} strokeWidth={2} /> Limpiar
                  </button>
                  <button
                    type="button"
                    className="btn-primario"
                    onClick={aplicarCalculadoraACaja}
                    disabled={totalCalculadora === 0}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    <Check size={14} strokeWidth={2.5} /> Usar este valor
                  </button>
                </div>
              </div>
            </div>
          )}

          <form className="form-caja" onSubmit={guardar}>
            <div className="campo">
              <label htmlFor="monto-caja">
                Plata física en gaveta hoy ($ COP)
              </label>
              <MontoInput
                id="monto-caja"
                placeholder="0"
                value={monto}
                onChange={setMonto}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="nota-caja">Nota u observación del turno (opcional)</label>
              <input
                id="nota-caja"
                type="text"
                placeholder="Ej: Se dejó base de $50.000 para mañana"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primario" disabled={guardando}>
              <Wallet size={16} strokeWidth={2} aria-hidden="true" />
              {guardando ? 'Guardando...' : 'Guardar cierre del día'}
            </button>
          </form>
        </div>
      </section>

      {/* 3. Historial de Cierres Registrados */}
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">Historial de cierres de caja</h3>
        </div>
        <div className="panel-cuerpo sin-relleno">
          <ul className="historial-caja" style={{ padding: '0 18px' }}>
            {historial.map((c) => (
              <li key={c.id}>
                <span className="fecha">
                  {new Date(c.fecha).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                <span className="monto">{formatearPesos(c.monto)}</span>
                <span className="nota">{c.nota || '—'}</span>
                <span className="fila-mov-acciones">
                  <button
                    className="btn-editar-nombre"
                    onClick={() => abrirEdicion(c)}
                    aria-label="Editar cierre"
                    title="Editar cierre"
                  >
                    <Pencil size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    className="btn-borrar"
                    onClick={() => setCajaABorrar(c.id)}
                    aria-label="Eliminar cierre"
                    title="Eliminar cierre"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </span>
              </li>
            ))}
            {!historial.length && (
              <li className="vacio">
                <Inbox className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
                Sin cierres todavía. Registre el primero arriba.
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Modal de Edición de Cierre */}
      {cajaAEditar && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setCajaAEditar(null)}>
          <form className="dialogo" onSubmit={guardarEdicion}>
            <div className="dialogo-cabecera">
              <span className="dialogo-icono" aria-hidden="true">
                <Pencil size={18} strokeWidth={2} />
              </span>
              <h2>Editar cierre de caja</h2>
            </div>
            <MontoInput
              autoFocus
              placeholder="0"
              value={montoEditado}
              onChange={setMontoEditado}
              required
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={notaEditada}
              onChange={(e) => setNotaEditada(e.target.value)}
              style={{ textAlign: 'left', fontSize: 15 }}
            />
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setCajaAEditar(null)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Diálogo de Confirmación para Borrar Cierre */}
      {cajaABorrar && (
        <ConfirmDialog
          titulo="Eliminar cierre de caja"
          mensaje="Esta acción eliminará el registro de caja de este turno. ¿Desea continuar?"
          textoConfirmar="Eliminar"
          onConfirmar={confirmarBorrarCaja}
          onCancelar={() => setCajaABorrar(null)}
        />
      )}
    </div>
  );
}
