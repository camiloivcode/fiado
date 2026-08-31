import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';

export default function Caja() {
  const { mostrarError } = useToast();
  const [historial, setHistorial] = useState([]);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

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
      cargar();
    } catch (e) {
      mostrarError(e.message);
    }
  }

  return (
    <div className="pagina">
      <h2>Caja</h2>
      <form className="form-caja" onSubmit={guardar}>
        <label htmlFor="monto-caja">Plata en caja hoy</label>
        <input id="monto-caja" type="text" inputMode="numeric" placeholder="0" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        <label htmlFor="nota-caja">Nota (opcional)</label>
        <input id="nota-caja" type="text" placeholder="Ej: faltó cambio" value={nota} onChange={(e) => setNota(e.target.value)} />
        <button type="submit" className="btn-primario">Guardar cierre del día</button>
      </form>
      <ul className="historial-caja">
        {historial.map((c) => (
          <li key={c.id}>
            <span className="fecha">{new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="monto">{formatearPesos(c.monto)}</span>
            <span className="nota">{c.nota}</span>
          </li>
        ))}
        {!historial.length && <li className="vacio">Sin cierres todavía.</li>}
      </ul>
    </div>
  );
}
