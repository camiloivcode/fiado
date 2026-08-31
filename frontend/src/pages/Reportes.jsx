import { useState } from 'react';
import { Search, FileX, Download, Rows3 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';

function hoyISO() {
  return new Date().toLocaleDateString('en-CA');
}

function celdaCSV(valor) {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

function exportarCSV(reporte, desde, hasta) {
  const filas = [
    ...reporte.movimientos.map((m) => [m.fecha.slice(0, 10), m.tipo === 'fiado' ? 'Fiado' : 'Abono', m.monto]),
    ...reporte.caja.map((c) => [c.fecha.slice(0, 10), 'Cierre de caja', c.monto]),
  ].sort((a, b) => a[0].localeCompare(b[0]));

  const filasCSV = [['Fecha', 'Tipo', 'Monto'], ...filas]
    .map((fila) => fila.map(celdaCSV).join(','))
    .join('\r\n');

  const blob = new Blob([`﻿${filasCSV}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `reporte_${desde}_a_${hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const { mostrarError } = useToast();
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [compacta, setCompacta] = useState(() => localStorage.getItem('densidadCompacta') === '1');

  function alternarDensidad() {
    setCompacta((actual) => {
      const nuevo = !actual;
      localStorage.setItem('densidadCompacta', nuevo ? '1' : '0');
      return nuevo;
    });
  }

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
      <section className="panel">
        <div className="panel-cuerpo">
          <form className="form-reportes" onSubmit={consultar}>
            <div className="campo">
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primario">
              <Search size={16} strokeWidth={2} aria-hidden="true" /> Consultar
            </button>
          </form>
        </div>
      </section>

      {reporte && (
        <>
          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Tendencia del rango</h3>
            </div>
            <div className="panel-cuerpo">
              <TrendChart datos={reporte.porDia} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Movimientos</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secundario" onClick={alternarDensidad}>
                  <Rows3 size={15} strokeWidth={2} aria-hidden="true" /> {compacta ? 'Vista normal' : 'Vista compacta'}
                </button>
                {(reporte.movimientos.length > 0 || reporte.caja.length > 0) && (
                  <button type="button" className="btn-secundario" onClick={() => exportarCSV(reporte, desde, hasta)}>
                    <Download size={15} strokeWidth={2} aria-hidden="true" /> Exportar CSV
                  </button>
                )}
              </div>
            </div>
            <div className="panel-cuerpo sin-relleno">
              <div className="tabla-reporte-wrap">
                <table className={`tabla-reporte ${compacta ? 'compacta' : ''}`}>
                  <thead>
                    <tr><th>Fecha</th><th>Tipo</th><th className="col-monto">Monto</th></tr>
                  </thead>
                  <tbody>
                    {reporte.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.fecha).toLocaleDateString('es-CO')}</td>
                        <td>
                          <span className={`pill ${m.tipo === 'fiado' ? 'pill-debe' : 'pill-favor'}`}>
                            {m.tipo === 'fiado' ? 'Fiado' : 'Abono'}
                          </span>
                        </td>
                        <td className="col-monto">{formatearPesos(m.monto)}</td>
                      </tr>
                    ))}
                    {reporte.caja.map((c) => (
                      <tr key={c.id}>
                        <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                        <td><span className="pill pill-neutro">Cierre de caja</span></td>
                        <td className="col-monto">{formatearPesos(c.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!reporte.movimientos.length && !reporte.caja.length && (
                <p className="vacio">
                  <FileX className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
                  Sin datos en este rango.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
