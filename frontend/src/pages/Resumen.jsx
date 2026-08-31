import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Users, Wallet, UserX } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';
import Contador from '../components/Contador.jsx';
import Sparkline from '../components/Sparkline.jsx';
import AnilloProgreso from '../components/AnilloProgreso.jsx';
import Dinero from '../components/Dinero.jsx';

function rangoUltimos30Dias() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  const iso = (d) => d.toLocaleDateString('en-CA');
  return { desde: iso(desde), hasta: iso(hasta) };
}

export default function Resumen() {
  const { mostrarError } = useToast();
  const [resumen, setResumen] = useState(null);
  const [tendencia, setTendencia] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setResumen(await api.resumen());
        const { desde, hasta } = rangoUltimos30Dias();
        const reporte = await api.reportes(desde, hasta);
        setTendencia(reporte.porDia);
      } catch (e) {
        mostrarError(e.message);
      }
    })();
  }, []);

  const maxDeuda = Math.max(1, ...(resumen?.topDeudores.map((c) => c.saldo) ?? [1]));
  const totalFiadoMes = tendencia.reduce((acc, d) => acc + d.fiado, 0);
  const totalAbonoMes = tendencia.reduce((acc, d) => acc + d.abono, 0);
  const porcentajeCobrado = totalFiadoMes > 0 ? totalAbonoMes / totalFiadoMes : 0;

  if (!resumen) {
    return (
      <div className="pagina">
        <div className="tarjetas">
          {[0, 1, 2].map((i) => (
            <div className="tarjeta" key={i}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '80%', height: 26, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '100%', height: 28 }} />
            </div>
          ))}
        </div>
        <div className="resumen-grid">
          <section className="panel">
            <div className="panel-cabecera">
              <div className="skeleton" style={{ width: 160, height: 16 }} />
            </div>
            <div className="panel-cuerpo">
              <div className="skeleton" style={{ width: '100%', height: 220 }} />
            </div>
          </section>
          <div className="resumen-columna-derecha">
            <section className="panel">
              <div className="panel-cabecera">
                <div className="skeleton" style={{ width: 140, height: 16 }} />
              </div>
              <div className="panel-cuerpo panel-cobrado">
                <div className="skeleton" style={{ width: 84, height: 84, borderRadius: '999px' }} />
                <div className="skeleton" style={{ width: 100, height: 32 }} />
              </div>
            </section>
            <section className="panel">
              <div className="panel-cabecera">
                <div className="skeleton" style={{ width: 120, height: 16 }} />
              </div>
              <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <div className="skeleton" key={i} style={{ width: '100%', height: 56 }} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="tarjetas">
        <div className="tarjeta debe">
          <span className="tarjeta-icono debe" aria-hidden="true"><Banknote className="icono" size={18} strokeWidth={1.75} /></span>
          <span className="tarjeta-etiqueta">Total fiado</span>
          <strong className="tarjeta-valor debe"><Contador valor={resumen.totalFiado} formatear={(v) => <Dinero valor={v} />} /></strong>
          <Sparkline datos={resumen.tendencias.totalFiado} color="var(--rojo)" />
        </div>
        <div className="tarjeta">
          <span className="tarjeta-icono" aria-hidden="true"><Users className="icono" size={18} strokeWidth={1.75} /></span>
          <span className="tarjeta-etiqueta">Clientes que deben</span>
          <strong className="tarjeta-valor">{resumen.clientesConDeuda}</strong>
          <Sparkline datos={resumen.tendencias.clientesConDeuda} color="var(--acento)" />
        </div>
        <div className="tarjeta favor">
          <span className="tarjeta-icono favor" aria-hidden="true"><Wallet className="icono" size={18} strokeWidth={1.75} /></span>
          <span className="tarjeta-etiqueta">Caja de hoy</span>
          <strong className="tarjeta-valor favor"><Contador valor={resumen.cajaHoy} formatear={(v) => <Dinero valor={v} />} /></strong>
          <Sparkline datos={resumen.tendencias.cajaHoy} color="var(--verde)" />
        </div>
      </div>

      <div className="resumen-grid">
        <section className="panel">
          <div className="panel-cabecera">
            <h3 className="panel-titulo">Tendencia (últimos 30 días)</h3>
          </div>
          <div className="panel-cuerpo">
            <TrendChart datos={tendencia} />
          </div>
        </section>

        <div className="resumen-columna-derecha">
          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Cobrado (30 días)</h3>
            </div>
            <div className="panel-cuerpo panel-cobrado">
              <AnilloProgreso porcentaje={porcentajeCobrado} color="var(--verde)" />
              <div>
                <span className="panel-cobrado-etiqueta">Abonado</span>
                <div className="panel-cobrado-valor"><Dinero valor={totalAbonoMes} /></div>
                <p className="panel-cobrado-nota">de {formatearPesos(totalFiadoMes)} fiado</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-cabecera">
              <h3 className="panel-titulo">Top deudores</h3>
            </div>
            <div className="panel-cuerpo sin-relleno">
              <ul className="lista-clientes" style={{ padding: '8px' }}>
                {resumen.topDeudores.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clientes/${c.id}`} className="fila-cliente">
                      <span
                        className="fila-cliente-barra"
                        style={{ width: `${(c.saldo / maxDeuda) * 100}%` }}
                        aria-hidden="true"
                      />
                      <span className={`avatar ${claseAvatar(c.nombre)}`} aria-hidden="true">{c.nombre.slice(0, 2).toUpperCase()}</span>
                      <span className="fila-cliente-info">
                        <span className="nombre">{c.nombre}</span>
                      </span>
                      <span className="fila-cliente-saldo">
                        <span className="saldo debe">{formatearPesos(c.saldo)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {!resumen.topDeudores.length && (
                  <li className="vacio">
                    <UserX className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
                    Nadie debe por ahora.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
