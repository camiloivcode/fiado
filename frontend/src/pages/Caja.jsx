import { useEffect, useState } from 'react';
import { Wallet, Inbox, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import MontoInput from '../components/MontoInput.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function Caja() {
  const { mostrarError, mostrarExito } = useToast();
  const [historial, setHistorial] = useState([]);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
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

  async function guardar(evento) {
    evento.preventDefault();
    try {
      await api.cerrarCaja(Number(monto), nota);
      setMonto('');
      setNota('');
      mostrarExito('Cierre guardado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  function abrirEdicion(cierre) {
    setCajaAEditar(cierre);
    setMontoEditado(String(cierre.monto));
    setNotaEditada(cierre.nota);
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

  return (
    <div className="pagina">
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">
            <Wallet size={16} strokeWidth={1.75} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />
            Cierre del día
          </h3>
        </div>
        <div className="panel-cuerpo">
          <form className="form-caja" onSubmit={guardar}>
            <div className="campo">
              <label htmlFor="monto-caja">Plata en caja hoy</label>
              <MontoInput id="monto-caja" placeholder="0" value={monto} onChange={setMonto} required />
            </div>
            <div className="campo">
              <label htmlFor="nota-caja">Nota (opcional)</label>
              <input id="nota-caja" type="text" placeholder="Ej: faltó cambio" value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
            <button type="submit" className="btn-primario">Guardar cierre del día</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">Historial de cierres</h3>
        </div>
        <div className="panel-cuerpo sin-relleno">
          <ul className="historial-caja" style={{ padding: '0 18px' }}>
            {historial.map((c) => (
              <li key={c.id}>
                <span className="fecha">{new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span className="monto">{formatearPesos(c.monto)}</span>
                <span className="nota">{c.nota}</span>
                <span className="fila-mov-acciones">
                  <button className="btn-editar-nombre" onClick={() => abrirEdicion(c)} aria-label="Editar cierre">
                    <Pencil size={15} strokeWidth={1.75} />
                  </button>
                  <button className="btn-borrar" onClick={() => setCajaABorrar(c.id)} aria-label="Eliminar cierre">
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </span>
              </li>
            ))}
            {!historial.length && (
              <li className="vacio">
                <Inbox className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
                Sin cierres todavía.
              </li>
            )}
          </ul>
        </div>
      </section>

      {cajaAEditar && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setCajaAEditar(null)}>
          <form className="dialogo" onSubmit={guardarEdicion}>
            <div className="dialogo-cabecera">
              <span className="dialogo-icono" aria-hidden="true">
                <Pencil size={18} strokeWidth={2} />
              </span>
              <h2>Editar cierre</h2>
            </div>
            <MontoInput autoFocus placeholder="0" value={montoEditado} onChange={setMontoEditado} required />
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

      {cajaABorrar && (
        <ConfirmDialog
          titulo="Eliminar cierre de caja"
          mensaje="Esta acción no se puede deshacer."
          textoConfirmar="Eliminar"
          onConfirmar={confirmarBorrarCaja}
          onCancelar={() => setCajaABorrar(null)}
        />
      )}
    </div>
  );
}
