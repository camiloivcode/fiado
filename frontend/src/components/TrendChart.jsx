import { formatearPesos } from '../format.js';

export default function TrendChart({ datos }) {
  const ancho = 600;
  const alto = 220;
  const margen = { top: 16, right: 16, bottom: 28, left: 48 };
  const areaAncho = ancho - margen.left - margen.right;
  const areaAlto = alto - margen.top - margen.bottom;

  if (!datos.length) {
    return <p className="chart-vacio">Sin movimientos en este rango.</p>;
  }

  const maxValor = Math.max(1, ...datos.flatMap((d) => [d.fiado, d.abono]));
  const x = (i) => margen.left + (i / Math.max(1, datos.length - 1)) * areaAncho;
  const y = (v) => margen.top + areaAlto - (v / maxValor) * areaAlto;
  const linea = (campo) => datos.map((d, i) => `${x(i)},${y(d[campo])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="trend-chart" role="img" aria-label="Tendencia de fiado y abonos">
      <line x1={margen.left} y1={margen.top + areaAlto} x2={ancho - margen.right} y2={margen.top + areaAlto} className="chart-eje" />
      <polyline points={linea('fiado')} className="chart-linea chart-linea-fiado" />
      <polyline points={linea('abono')} className="chart-linea chart-linea-abono" />
      {datos.map((d, i) => (
        <g key={d.dia}>
          <circle cx={x(i)} cy={y(d.fiado)} r="3" className="chart-punto-fiado">
            <title>{`${d.dia} · Fiado: ${formatearPesos(d.fiado)}`}</title>
          </circle>
          <circle cx={x(i)} cy={y(d.abono)} r="3" className="chart-punto-abono">
            <title>{`${d.dia} · Abonos: ${formatearPesos(d.abono)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
