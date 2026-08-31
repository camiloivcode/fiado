import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import TrendChart from '../components/TrendChart.jsx';

function rangoUltimos30Dias() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  const iso = (d) => d.toISOString().slice(0, 10);
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

  if (!resumen) return null;

  return (
    <div className="pagina">
      <h2>Resumen</h2>
      <div className="tarjetas">
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Total fiado</span>
          <strong className="tarjeta-valor debe">{formatearPesos(resumen.totalFiado)}</strong>
        </div>
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Clientes que deben</span>
          <strong className="tarjeta-valor">{resumen.clientesConDeuda}</strong>
        </div>
        <div className="tarjeta">
          <span className="tarjeta-etiqueta">Caja de hoy</span>
          <strong className="tarjeta-valor favor">{formatearPesos(resumen.cajaHoy)}</strong>
        </div>
      </div>

      <h3>Tendencia (últimos 30 días)</h3>
      <TrendChart datos={tendencia} />

      <h3>Top deudores</h3>
      <ul className="lista-clientes">
        {resumen.topDeudores.map((c) => (
          <li key={c.id}>
            <Link to={`/clientes/${c.id}`} className="fila-cliente">
              <span className="nombre">{c.nombre}</span>
              <span className="saldo debe">{formatearPesos(c.saldo)}</span>
            </Link>
          </li>
        ))}
        {!resumen.topDeudores.length && <li className="vacio">Nadie debe por ahora.</li>}
      </ul>
    </div>
  );
}
