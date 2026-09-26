import { useState } from 'react';
import { Search, FileX, Download, Rows3, Calendar, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

function hoyISO() {
  return new Date().toLocaleDateString('en-CA');
}

function diasAtrasISO(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString('en-CA');
}

function primerDiaMesISO() {
  const d = new Date();
  d.setDate(1);
  return d.toLocaleDateString('en-CA');
}

function celdaCSV(valor) {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

function filasCSVDe(reporte) {
  const filas = [
    ...reporte.movimientos.map((m) => [m.fecha.slice(0, 10), m.tipo === 'fiado' ? 'Fiado' : 'Abono', m.monto]),
    ...reporte.caja.map((c) => [c.fecha.slice(0, 10), 'Cierre de caja', c.monto]),
  ].sort((a, b) => a[0].localeCompare(b[0]));

  return [['Fecha', 'Tipo', 'Monto'], ...filas]
    .map((fila) => fila.map(celdaCSV).join(','))
    .join('\r\n');
}

async function exportarCSV(reporte, desde, hasta) {
  const nombre = `reporte_${desde}_a_${hasta}.csv`;
  const contenido = `\uFEFF${filasCSVDe(reporte)}`;

  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: nombre,
      data: contenido,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: nombre, url: uri });
    return;
  }

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const { mostrarError } = useToast();
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [compacta, setCompacta] = useState(() => localStorage.getItem('densidadCompacta') === '1');

  function alternarDensidad() {
    setCompacta((actual) => {
      const nuevo = !actual;
      localStorage.setItem('densidadCompacta', nuevo ? '1' : '0');
      return nuevo;
    });
  }

  async function consultarRango(dDesde, dHasta) {
    setCargando(true);
    try {
      setReporte(await api.reportes(dDesde, dHasta));
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function aplicarPreset(nombre) {
    let nuevoDesde = hoyISO();
    const nuevoHasta = hoyISO();

    if (nombre === 'hoy') {
      nuevoDesde = hoyISO();
    } else if (nombre === '7d') {
      nuevoDesde = diasAtrasISO(6);
    } else if (nombre === '30d') {
      nuevoDesde = diasAtrasISO(29);
    } else if (nombre === 'mes') {
      nuevoDesde = primerDiaMesISO();
    }

    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    consultarRango(nuevoDesde, nuevoHasta);
  }

  async function consultar(evento) {
    evento?.preventDefault();
    consultarRango(desde, hasta);
  }

  useRefrescarAlEnfocar(() => { if (reporte) consultarRango(desde, hasta); });

  // Cálculos de resumen
  const totalFiado = reporte
    ? reporte.movimientos.filter((m) => m.tipo === 'fiado').reduce((acc, m) => acc + m.monto, 0)
    : 0;
  const totalAbono = reporte
    ? reporte.movimientos.filter((m) => m.tipo === 'abono').reduce((acc, m) => acc + m.monto, 0)
    : 0;
  const totalCaja = reporte
    ? reporte.caja.reduce((acc, c) => acc + c.monto, 0)
    : 0;
  const balanceNeto = totalAbono - totalFiado;

  return (
    <div className="pagina">
      {/* Selector de Rango y Presets */}
      <section className="panel">
        <div className="panel-cuerpo">
          <div className="presetes-fechas">
            <button
              type="button"
              className={`btn-preset ${desde === hoyISO() && hasta === hoyISO() ? 'activo' : ''}`}
              onClick={() => aplicarPreset('hoy')}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`btn-preset ${desde === diasAtrasISO(6) && hasta === hoyISO() ? 'activo' : ''}`}
              onClick={() => aplicarPreset('7d')}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              className={`btn-preset ${desde === diasAtrasISO(29) && hasta === hoyISO() ? 'activo' : ''}`}
              onClick={() => aplicarPreset('30d')}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              className={`btn-preset ${desde === primerDiaMesISO() && hasta === hoyISO() ? 'activo' : ''}`}
              onClick={() => aplicarPreset('mes')}
            >
              Este mes
            </button>
          </div>

          <form className="form-reportes" onSubmit={consultar}>
            <div className="campo">
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primario" disabled={cargando}>
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              {cargando ? 'Consultando...' : 'Consultar'}
            </button>
          </form>
        </div>
      </section>

      {reporte && (
        <>
          {/* Tarjetas KPI de Totales del Rango */}
          <div className="reporte-kpis-grid">
            <div className="reporte-kpi-card">
              <span className="reporte-kpi-etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ArrowUpRight size={14} color="var(--rojo)" /> Total Fiado (Nuevos)
              </span>
              <strong className="reporte-kpi-valor debe">{formatearPesos(totalFiado)}</strong>
            </div>

            <div className="reporte-kpi-card">
              <span className="reporte-kpi-etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ArrowDownLeft size={14} color="var(--verde)" /> Total Abonos Cobrados
              </span>
              <strong className="reporte-kpi-valor favor">{formatearPesos(totalAbono)}</strong>
            </div>

            <div className="reporte-kpi-card">
              <span className="reporte-kpi-etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wallet size={14} color="var(--acento)" /> Cierres de Caja
              </span>
              <strong className="reporte-kpi-valor">{formatearPesos(totalCaja)}</strong>
            </div>

            <div className="reporte-kpi-card">
              <span className="reporte-kpi-etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <TrendingUp size={14} /> Balance Neto Crédito
              </span>
              <strong className={`reporte-kpi-valor ${balanceNeto >= 0 ? 'favor' : 'debe'}`}>
                {balanceNeto >= 0 ? `+${formatearPesos(balanceNeto)}` : formatearPesos(balanceNeto)}
              </strong>
            </div>
          </div>

          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Tendencia del rango seleccionado</h3>
            </div>
            <div className="panel-cuerpo">
              <TrendChart datos={reporte.porDia} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Movimientos detallados ({reporte.movimientos.length + reporte.caja.length})</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secundario" onClick={alternarDensidad}>
                  <Rows3 size={15} strokeWidth={2} aria-hidden="true" /> {compacta ? 'Vista normal' : 'Vista compacta'}
                </button>
                {(reporte.movimientos.length > 0 || reporte.caja.length > 0) && (
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={async () => {
                      try {
                        await exportarCSV(reporte, desde, hasta);
                      } catch (e) {
                        mostrarError(e.message);
                      }
                    }}
                  >
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
