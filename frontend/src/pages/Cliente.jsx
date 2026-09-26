import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Trash2, UserRoundX, Pencil, Phone, MessageCircle, Share2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import MontoInput from '../components/MontoInput.jsx';
import Sparkline from '../components/Sparkline.jsx';
import Dinero from '../components/Dinero.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

export default function Cliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarError, mostrarExito } = useToast();
  const [cliente, setCliente] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [dialogo, setDialogo] = useState(null); // 'fiado' | 'abono' | 'editar'
  const [monto, setMonto] = useState('');
  const [nombreEditado, setNombreEditado] = useState('');
  const [telefonoEditado, setTelefonoEditado] = useState('');
  const [movABorrar, setMovABorrar] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  async function cargar() {
    try {
      const clientes = await api.listarClientes();
      const encontrado = clientes.find((c) => c.id === id);
      if (!encontrado) return navigate('/clientes');
      setCliente(encontrado);
      setMovimientos(await api.movimientosDeCliente(id));
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, [id]);
  useRefrescarAlEnfocar(cargar);

  async function guardarMovimiento(evento) {
    evento.preventDefault();
    try {
      await api.crearMovimiento(id, dialogo, Number(monto));
      setMonto('');
      setDialogo(null);
      mostrarExito(dialogo === 'fiado' ? 'Fiado registrado' : 'Abono registrado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function guardarEdicion(evento) {
    evento.preventDefault();
    const nombre = nombreEditado.trim();
    if (!nombre) return;
    try {
      await api.editarCliente(id, nombre, telefonoEditado.trim());
      setDialogo(null);
      mostrarExito('Cliente actualizado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function confirmarBorrarMovimiento() {
    try {
      await api.eliminarMovimiento(movABorrar);
      setMovABorrar(null);
      mostrarExito('Movimiento eliminado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function confirmarEliminarCliente() {
    try {
      await api.eliminarCliente(id);
      mostrarExito('Cliente eliminado');
      navigate('/clientes');
    } catch (e) {
      mostrarError(e.message);
    }
  }

  if (!cliente) {
    return (
      <div className="pagina">
        <div className="skeleton" style={{ width: 90, height: 14, marginBottom: 16 }} />
        <div className="cliente-hero">
          <div className="skeleton avatar-grande" style={{ borderRadius: '999px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ width: 160, height: 24 }} />
            <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 999 }} />
          </div>
        </div>
        <div className="saldo-grande">
          <div className="skeleton" style={{ width: 160, height: 34, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: 60, height: 12, margin: '0 auto' }} />
          <div className="skeleton" style={{ width: 140, height: 32, margin: '12px auto 0' }} />
        </div>
        <div className="acciones">
          <div className="skeleton" style={{ flex: 1, height: 48, borderRadius: 8 }} />
          <div className="skeleton" style={{ flex: 1, height: 48, borderRadius: 8 }} />
        </div>
        <section className="panel">
          <div className="panel-cabecera">
            <div className="skeleton" style={{ width: 100, height: 16 }} />
          </div>
          <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div className="skeleton" key={i} style={{ height: 44 }} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const saldo = cliente.saldo;
  const estado = saldo > 0 ? 'debe' : saldo < 0 ? 'favor' : 'neutro';
  const historialSaldo = [...movimientos]
    .reverse()
    .reduce((acc, m) => [...acc, (acc.at(-1) ?? 0) + (m.tipo === 'fiado' ? m.monto : -m.monto)], []);

  // WhatsApp reminder link
  const telefonoLimpio = (cliente.telefono || '').replace(/\D/g, '');
  const mensajeWA = encodeURIComponent(
    `Hola ${cliente.nombre}, cordial saludo. Te comparto el resumen de tu cuenta en Fiado:\n` +
    `• Saldo pendiente: ${formatearPesos(Math.max(0, saldo))}\n` +
    `¡Muchas gracias por tu confianza!`
  );
  const urlWhatsApp = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio.startsWith('57') ? telefonoLimpio : `57${telefonoLimpio}`}?text=${mensajeWA}`
    : null;

  return (
    <div className="pagina">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn-volver" onClick={() => navigate('/clientes')} style={{ margin: 0 }}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" /> Volver a Clientes
        </button>

        {urlWhatsApp && (
          <a
            href={urlWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            title="Enviar estado de cuenta por WhatsApp"
          >
            <MessageCircle size={15} strokeWidth={2} /> WhatsApp
          </a>
        )}
      </div>

      <div className="cliente-hero">
        <span className={`avatar avatar-grande ${claseAvatar(cliente.nombre)}`} aria-hidden="true">
          {cliente.nombre.slice(0, 2).toUpperCase()}
        </span>
        <div className="cliente-hero-info">
          <h2 className="titulo-editable">
            {cliente.nombre}
            <button
              className="btn-editar-nombre"
              onClick={() => {
                setNombreEditado(cliente.nombre);
                setTelefonoEditado(cliente.telefono || '');
                setDialogo('editar');
              }}
              aria-label="Editar cliente"
              title="Editar datos del cliente"
            >
              <Pencil size={15} strokeWidth={1.75} />
            </button>
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`pill pill-${estado}`}>
              {estado === 'debe' ? 'Debe' : estado === 'favor' ? 'A favor' : 'Al día'}
            </span>
            {cliente.telefono && (
              <span style={{ fontSize: 13, color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} strokeWidth={1.75} /> {cliente.telefono}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`saldo-grande ${saldo > 0 ? 'debe' : saldo < 0 ? 'favor' : ''}`}>
        <Dinero valor={Math.abs(saldo)} />
        <small>{saldo < 0 ? 'a favor' : saldo === 0 ? 'cuenta al día' : 'saldo pendiente por pagar'}</small>
        <Sparkline
          datos={historialSaldo}
          color={saldo > 0 ? 'var(--rojo)' : saldo < 0 ? 'var(--verde)' : 'var(--texto-suave)'}
          className="sparkline-saldo"
        />
      </div>

      <div className="acciones">
        <button className="btn-fiar" onClick={() => setDialogo('fiado')}>
          <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" /> + Fiar Producto
        </button>
        <button className="btn-abonar" onClick={() => setDialogo('abono')}>
          <ArrowDownLeft size={18} strokeWidth={2} aria-hidden="true" /> + Abonar Dinero
        </button>
      </div>

      <section className="panel">
        <div className="panel-cabecera">
          <div>
            <h3 className="panel-titulo">Libreta de Movimientos</h3>
            <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
              {movimientos.length} {movimientos.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>
        <div className="panel-cuerpo sin-relleno">
          <ul className="historial" style={{ padding: '0 18px' }}>
            {movimientos.map((m) => (
              <li key={m.id} className="fila-mov">
                <span className={`tipo ${m.tipo}`}>
                  {m.tipo === 'fiado' ? <ArrowUpRight size={13} strokeWidth={2.5} aria-hidden="true" /> : <ArrowDownLeft size={13} strokeWidth={2.5} aria-hidden="true" />}
                  {m.tipo === 'fiado' ? 'Fiado' : 'Abono'}
                </span>
                <span className="monto" style={{ color: m.tipo === 'fiado' ? 'var(--rojo)' : 'var(--verde)' }}>
                  {m.tipo === 'fiado' ? '+' : '-'}{formatearPesos(m.monto)}
                </span>
                <span className="fecha">
                  {new Date(m.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button className="btn-borrar" onClick={() => setMovABorrar(m.id)} aria-label="Eliminar movimiento" title="Eliminar registro">
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {!movimientos.length && (
              <li className="vacio">
                <UserRoundX className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
                Sin movimientos todavía. Usa "+ Fiar" o "+ Abonar" arriba.
              </li>
            )}
          </ul>
        </div>
      </section>

      <button className="btn-eliminar-cliente" onClick={() => setConfirmarEliminar(true)}>
        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /> Eliminar cliente
      </button>

      {dialogo === 'editar' && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDialogo(null)}>
          <form className="dialogo" onSubmit={guardarEdicion}>
            <div className="dialogo-cabecera">
              <span className="dialogo-icono" aria-hidden="true">
                <Pencil size={18} strokeWidth={2} />
              </span>
              <h2>Editar cliente</h2>
            </div>
            <div className="campo">
              <label htmlFor="nombre-editado" style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Nombre completo *</label>
              <input
                id="nombre-editado"
                type="text"
                autoFocus
                placeholder="Nombre"
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                required
                style={{ textAlign: 'left', fontSize: 15 }}
              />
            </div>
            <div className="campo">
              <label htmlFor="telefono-editado" style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Teléfono / WhatsApp</label>
              <input
                id="telefono-editado"
                type="tel"
                placeholder="Ej: 312 456 7890"
                value={telefonoEditado}
                onChange={(e) => setTelefonoEditado(e.target.value)}
                style={{ textAlign: 'left', fontSize: 15 }}
              />
            </div>
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setDialogo(null)}>Cancelar</button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}

      {(dialogo === 'fiado' || dialogo === 'abono') && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDialogo(null)}>
          <form className="dialogo" onSubmit={guardarMovimiento}>
            <div className="dialogo-cabecera">
              <span className={`dialogo-icono ${dialogo === 'fiado' ? 'rojo' : 'verde'}`} aria-hidden="true">
                {dialogo === 'fiado'
                  ? <ArrowUpRight size={18} strokeWidth={2} />
                  : <ArrowDownLeft size={18} strokeWidth={2} />}
              </span>
              <div>
                <h2>{dialogo === 'fiado' ? 'Nuevo Fiado' : 'Registrar Abono'}</h2>
                <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{cliente.nombre}</span>
              </div>
            </div>

            <MontoInput
              autoFocus
              placeholder="0"
              value={monto}
              onChange={setMonto}
              required
            />

            {/* Chips rápidos de cantidades comunes en tiendas */}
            <div className="chips-monto">
              <button type="button" className="chip-monto" onClick={() => setMonto('5000')}>$5.000</button>
              <button type="button" className="chip-monto" onClick={() => setMonto('10000')}>$10.000</button>
              <button type="button" className="chip-monto" onClick={() => setMonto('20000')}>$20.000</button>
              <button type="button" className="chip-monto" onClick={() => setMonto('50000')}>$50.000</button>
              {dialogo === 'abono' && saldo > 0 && (
                <button
                  type="button"
                  className="chip-monto total"
                  onClick={() => setMonto(String(saldo))}
                >
                  Pagar total ({formatearPesos(saldo)})
                </button>
              )}
            </div>

            <div className="dialogo-acciones">
              <button type="button" onClick={() => setDialogo(null)}>Cancelar</button>
              <button type="submit">
                {dialogo === 'fiado' ? 'Guardar Fiado' : 'Guardar Abono'}
              </button>
            </div>
          </form>
        </div>
      )}

      {movABorrar && (
        <ConfirmDialog
          titulo="Eliminar movimiento"
          mensaje="Esta acción recalculará el saldo del cliente de inmediato. ¿Deseas continuar?"
          textoConfirmar="Eliminar"
          onConfirmar={confirmarBorrarMovimiento}
          onCancelar={() => setMovABorrar(null)}
        />
      )}

      {confirmarEliminar && (
        <ConfirmDialog
          titulo={`Eliminar a ${cliente.nombre}`}
          mensaje="Se borrará todo su historial de fiados y abonos. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar cliente"
          onConfirmar={confirmarEliminarCliente}
          onCancelar={() => setConfirmarEliminar(false)}
        />
      )}
    </div>
  );
}
