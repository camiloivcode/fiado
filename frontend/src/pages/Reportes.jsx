import { useState } from 'react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reportes() {
  const { mostrarError } = useToast();
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);

  async function consultar(evento) {
    evento.preventDefault();
    try {
      setReporte(await api.reportes(desde, hasta));
    } catch (e) {
      mostrarError(e.message);
    }
  }

  return (
    <div className="pagina">
      <h2>Reportes</h2>
      <form className="form-reportes" onSubmit={consultar}>
        <label htmlFor="desde">Desde</label>
        <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        <label htmlFor="hasta">Hasta</label>
        <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        <button type="submit" className="btn-primario">Consultar</button>
      </form>

      {reporte && (
        <>
          <TrendChart datos={reporte.porDia} />
          <div className="tabla-reporte-wrap">
            <table className="tabla-reporte">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Monto</th></tr>
              </thead>
              <tbody>
                {reporte.movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.fecha).toLocaleDateString('es-CO')}</td>
                    <td>{m.tipo === 'fiado' ? 'Fiado' : 'Abono'}</td>
                    <td>{formatearPesos(m.monto)}</td>
                  </tr>
                ))}
                {reporte.caja.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                    <td>Cierre de caja</td>
                    <td>{formatearPesos(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!reporte.movimientos.length && !reporte.caja.length && <p className="vacio">Sin datos en este rango.</p>}
        </>
      )}
    </div>
  );
}
