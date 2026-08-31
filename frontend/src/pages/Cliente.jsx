import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Cliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarError } = useToast();
  const [cliente, setCliente] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const [monto, setMonto] = useState('');

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

  async function guardarMovimiento(evento) {
    evento.preventDefault();
    try {
      await api.crearMovimiento(id, dialogo, Number(monto));
      setMonto('');
      setDialogo(null);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function borrarMovimiento(movId) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.eliminarMovimiento(movId);
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  async function eliminarCliente() {
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borra todo su historial.`)) return;
    try {
      await api.eliminarCliente(id);
      navigate('/clientes');
    } catch (e) {
      mostrarError(e.message);
    }
  }

  if (!cliente) return null;
  const saldo = cliente.saldo;

  return (
    <div className="pagina">
      <button className="btn-volver" onClick={() => navigate('/clientes')}>← Clientes</button>
      <h2>{cliente.nombre}</h2>
      <div className={`saldo-grande ${saldo > 0 ? 'debe' : saldo < 0 ? 'favor' : ''}`}>
        {formatearPesos(Math.abs(saldo))}
        <small>{saldo < 0 ? 'a favor' : saldo === 0 ? 'al día' : 'debe'}</small>
      </div>
      <div className="acciones">
        <button className="btn-fiar" onClick={() => setDialogo('fiado')}>Fiar</button>
        <button className="btn-abonar" onClick={() => setDialogo('abono')}>Abonar</button>
      </div>
      <ul className="historial">
        {movimientos.map((m) => (
          <li key={m.id} className="fila-mov">
            <span className={`tipo ${m.tipo}`}>{m.tipo === 'fiado' ? 'Fió' : 'Abonó'}</span>
            <span className="monto">{formatearPesos(m.monto)}</span>
            <span className="fecha">
              {new Date(m.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <button className="btn-borrar" onClick={() => borrarMovimiento(m.id)} aria-label="Eliminar">✕</button>
          </li>
        ))}
        {!movimientos.length && <li className="vacio">Sin movimientos todavía.</li>}
      </ul>
      <button className="btn-eliminar-cliente" onClick={eliminarCliente}>Eliminar cliente</button>

      {dialogo && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDialogo(null)}>
          <form className="dialogo" onSubmit={guardarMovimiento}>
            <h2>{dialogo === 'fiado' ? 'Fiar' : 'Abonar'}</h2>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
            <div className="dialogo-acciones">
              <button type="button" onClick={() => setDialogo(null)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
