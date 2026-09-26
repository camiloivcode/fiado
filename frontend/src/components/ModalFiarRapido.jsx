import { useState, useEffect } from 'react';
import { Plus, X, Search, Check, AlertTriangle, ShoppingBag, Sparkles, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from './Toast.jsx';
import MontoInput from './MontoInput.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const PRODUCTOS_SUGERIDOS = [
  '2 Leches',
  'Pan',
  'Huevos',
  'Arroz',
  'Aceite',
  'Gaseosa',
  'Mecato',
  'Café',
  'Azúcar',
];

const CHIPS_MONTO = [2000, 5000, 10000, 20000, 50000];

export default function ModalFiarRapido({ onClose, onGuardado, clientePreseleccionado = null }) {
  const { mostrarError, mostrarExito } = useToast();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(clientePreseleccionado);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [guardandoNuevoCliente, setGuardandoNuevoCliente] = useState(false);
  const [confirmarExcesoCupo, setConfirmarExcesoCupo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const lista = await api.listarClientes();
        setClientes(lista);
        if (clientePreseleccionado) {
          const encontrado = lista.find((c) => c.id === clientePreseleccionado.id);
          if (encontrado) setClienteSeleccionado(encontrado);
        }
      } catch (e) {
        mostrarError(e.message);
      }
    }
    cargar();
  }, [clientePreseleccionado]);

  const filtrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono && c.telefono.includes(busqueda))
  );

  function agregarProducto(prod) {
    setDescripcion((prev) => {
      const limpia = prev.trim();
      if (!limpia) return prod;
      if (limpia.toLowerCase().includes(prod.toLowerCase())) return limpia;
      return `${limpia}, ${prod}`;
    });
  }

  function sumarMonto(valor) {
    const actual = Number(monto) || 0;
    setMonto(String(actual + valor));
  }

  async function crearClienteRapido(e) {
    e.preventDefault();
    if (!nombreNuevo.trim() || guardandoNuevoCliente) return;
    setGuardandoNuevoCliente(true);
    try {
      const creado = await api.crearCliente(nombreNuevo.trim(), telefonoNuevo.trim());
      setClientes((prev) => [...prev, creado]);
      setClienteSeleccionado(creado);
      setCreandoNuevo(false);
      setNombreNuevo('');
      setTelefonoNuevo('');
      mostrarExito('Cliente creado');
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setGuardandoNuevoCliente(false);
    }
  }

  // Comprobación de límite de crédito
  const montoNum = Number(monto) || 0;
  const saldoActual = clienteSeleccionado ? clienteSeleccionado.saldo : 0;
  const nuevoSaldo = saldoActual + montoNum;
  const limite = clienteSeleccionado ? clienteSeleccionado.limiteCredito : 0;
  const excedeCupo = limite > 0 && nuevoSaldo > limite;

  function handleIntentarGuardarFiado(e) {
    e.preventDefault();
    if (guardando) return;
    if (!clienteSeleccionado) {
      return mostrarError('Por favor selecciona a qué cliente fiar');
    }
    if (!montoNum || montoNum <= 0) {
      return mostrarError('Ingresa un monto válido mayor a cero');
    }

    // Si excede el cupo, pedir confirmación antes de guardar
    if (excedeCupo) {
      setConfirmarExcesoCupo(true);
      return;
    }

    ejecutarGuardado();
  }

  async function ejecutarGuardado() {
    if (guardando) return;
    setGuardando(true);
    setConfirmarExcesoCupo(false);
    try {
      const mov = await api.crearMovimiento(
        clienteSeleccionado.id,
        'fiado',
        montoNum,
        descripcion.trim()
      );
      mostrarExito(`Fiado de ${formatearPesos(montoNum)} registrado`);
      if (onGuardado) onGuardado(mov, clienteSeleccionado);
      onClose();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-fiar-rapido">
        <div className="modal-fiar-cabecera">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="modal-icono-fiar">
              <Plus size={20} strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="modal-titulo">Fiar a Cliente</h2>
              <span className="modal-sub">Registra artículos fiados al instante</span>
            </div>
          </div>
          <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar ventana">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleIntentarGuardarFiado} className="modal-fiar-cuerpo">
          {/* 1. Selección de Cliente */}
          {!clienteSeleccionado ? (
            <div className="fiar-seccion-cliente">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="campo-label">¿A quién le vas a fiar?</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setCreandoNuevo(!creandoNuevo)}
                >
                  <UserPlus size={13} strokeWidth={2} />
                  {creandoNuevo ? 'Buscar existente' : '+ Crear nuevo'}
                </button>
              </div>

              {creandoNuevo ? (
                <div className="crear-cliente-rapido-box">
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    autoFocus
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={telefonoNuevo}
                    onChange={(e) => setTelefonoNuevo(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primario btn-con-carga"
                    onClick={crearClienteRapido}
                    disabled={guardandoNuevoCliente || !nombreNuevo.trim()}
                  >
                    {guardandoNuevoCliente ? (
                      <>
                        <Loader2 size={14} className="icono-girando" strokeWidth={2.5} />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <span>Guardar y seleccionar</span>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <div className="buscador-envoltura" style={{ margin: '4px 0 8px' }}>
                    <Search className="buscador-icono" size={16} strokeWidth={2} />
                    <input
                      type="search"
                      className="buscador"
                      placeholder="Buscar por nombre o celular..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="lista-seleccion-clientes">
                    {filtrados.slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        className="item-seleccion-cliente"
                        onClick={() => setClienteSeleccionado(c)}
                      >
                        <span className={`avatar ${claseAvatar(c.nombre)}`} style={{ width: 32, height: 32, fontSize: 12 }}>
                          {c.nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong className="nombre-cliente-fiar">{c.nombre}</strong>
                          {c.telefono && <span className="sub-cliente-fiar">{c.telefono}</span>}
                        </div>
                        <span className="saldo-cliente-fiar">
                          Saldo: {formatearPesos(c.saldo)}
                        </span>
                      </div>
                    ))}
                    {!filtrados.length && (
                      <p className="vacio-mini">
                        No se encontró ningún cliente. Crea uno nuevo arriba.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="cliente-fiar-seleccionado">
              <div className="info-cliente-chip">
                <span className={`avatar ${claseAvatar(clienteSeleccionado.nombre)}`} style={{ width: 34, height: 34, fontSize: 13 }}>
                  {clienteSeleccionado.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 15, display: 'block', color: 'var(--texto)' }}>
                    {clienteSeleccionado.nombre}
                  </strong>
                  <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                    Debe actualmente: <strong>{formatearPesos(saldoActual)}</strong>
                  </span>
                </div>
                {!clientePreseleccionado && (
                  <button
                    type="button"
                    className="btn-cambiar-cliente"
                    onClick={() => setClienteSeleccionado(null)}
                  >
                    Cambiar
                  </button>
                )}
              </div>

              {excedeCupo && (
                <div className="alerta-cupo-aviso">
                  <AlertTriangle size={15} strokeWidth={2.5} />
                  <span>
                    <strong>Atención:</strong> Superará el cupo de {formatearPesos(limite)} (quedará en {formatearPesos(nuevoSaldo)}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Monto a Fiar */}
          <div className="campo" style={{ marginTop: 12 }}>
            <label className="campo-label" htmlFor="monto-fiar">¿Cuánto va a fiar? ($ COP)</label>
            <MontoInput
              id="monto-fiar"
              placeholder="0"
              value={monto}
              onChange={setMonto}
              required
            />
            {/* Chips de monto rápido */}
            <div className="chips-monto-fiar">
              {CHIPS_MONTO.map((v) => (
                <button
                  type="button"
                  key={v}
                  className="chip-monto-btn"
                  onClick={() => sumarMonto(v)}
                >
                  +{formatearPesos(v)}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Detalle de Productos (NUEVA FUNCIONALIDAD) */}
          <div className="campo" style={{ marginTop: 8 }}>
            <label className="campo-label" htmlFor="detalle-fiar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShoppingBag size={14} strokeWidth={2} />
                ¿Qué lleva el cliente? (opcional)
              </span>
              <span style={{ fontSize: 11, color: 'var(--texto-suave)', fontWeight: 400 }}>Toca los artículos abajo</span>
            </label>
            <input
              id="detalle-fiar"
              type="text"
              placeholder="Ej: 2 libras de arroz, leche, huevos..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />

            {/* Chips sugeridos de tienda */}
            <div className="chips-productos-sugeridos">
              {PRODUCTOS_SUGERIDOS.map((p) => (
                <button
                  type="button"
                  key={p}
                  className="chip-prod-tag"
                  onClick={() => agregarProducto(p)}
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Botón de Confirmación */}
          <div className="modal-fiar-acciones">
            <button
              type="submit"
              className="btn-primario btn-confirmar-fiar btn-con-carga"
              disabled={guardando || !clienteSeleccionado || montoNum <= 0}
            >
              {guardando ? (
                <>
                  <Loader2 size={18} className="icono-girando" strokeWidth={2.5} />
                  <span>Registrando fiado... por favor espera</span>
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  <span>Confirmar Fiado: {montoNum > 0 ? formatearPesos(montoNum) : '$0'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Alerta de confirmación si excede cupo */}
      {confirmarExcesoCupo && clienteSeleccionado && (
        <ConfirmDialog
          titulo="¿Aprobar fiado que excede cupo?"
          mensaje={`El cliente ${clienteSeleccionado.nombre} tiene un cupo fijado de ${formatearPesos(limite)}. Con este nuevo fiado de ${formatearPesos(montoNum)}, su deuda total ascenderá a ${formatearPesos(nuevoSaldo)}, sobrepasando el límite por ${formatearPesos(nuevoSaldo - limite)}. ¿Deseas aprobar y registrar este fiado de todas formas?`}
          textoConfirmar="Sí, autorizar y fiar"
          textoCancelar="Volver y revisar"
          tipoBoton="btn-advertencia"
          tipoIcono="advertencia"
          cargando={guardando}
          onConfirmar={ejecutarGuardado}
          onCancelar={() => setConfirmarExcesoCupo(false)}
        />
      )}
    </div>
  );
}
