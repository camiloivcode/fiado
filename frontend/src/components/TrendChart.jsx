import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatearPesos } from '../format.js';

function formatearCorto(valor) {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${Math.round(valor / 1_000)}k`;
  return String(valor);
}

function formatearFechaCorta(diaISO) {
  const [, mes, dia] = diaISO.split('-');
  return `${dia}/${mes}`;
}

export default function TrendChart({ datos }) {
  const [mostrado, setMostrado] = useState(false);

  useEffect(() => {
    setMostrado(false);
    const id = requestAnimationFrame(() => setMostrado(true));
    return () => cancelAnimationFrame(id);
  }, [datos]);

  const ancho = 640;
  const alto = 240;
  const margen = { top: 16, right: 16, bottom: 24, left: 40 };
  const areaAncho = ancho - margen.left - margen.right;
  const areaAlto = alto - margen.top - margen.bottom;

  if (!datos.length) {
    return (
      <div className="chart-vacio">
        <TrendingUp className="icono" size={28} strokeWidth={1.5} aria-hidden="true" />
        <span>Sin movimientos en este rango.</span>
      </div>
    );
  }

  const maxValor = Math.max(1, ...datos.flatMap((d) => [d.fiado, d.abono]));
  const x = (i) => margen.left + (i / Math.max(1, datos.length - 1)) * areaAncho;
  const y = (v) => margen.top + areaAlto - (v / maxValor) * areaAlto;
  const linea = (campo) => datos.map((d, i) => `${x(i)},${y(d[campo])}`).join(' ');
  const area = (campo) => {
    const base = margen.top + areaAlto;
    return `${margen.left},${base} ${linea(campo)} ${margen.left + areaAncho},${base}`;
  };

  const pasosY = 4;
  const lineasGrid = Array.from({ length: pasosY + 1 }, (_, i) => {
    const valor = (maxValor / pasosY) * i;
    return { y: y(valor), etiqueta: formatearCorto(valor) };
  });

  const indicesEjeX = datos.length > 1
    ? [0, Math.floor((datos.length - 1) / 2), datos.length - 1]
    : [0];

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="trend-chart" role="img" aria-label="Tendencia de fiado y abonos">
        <defs>
          <linearGradient id="gradienteFiado" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rojo)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--rojo)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradienteAbono" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--verde)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--verde)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {lineasGrid.map(({ y: gy, etiqueta }) => (
          <g key={gy}>
            <line x1={margen.left} y1={gy} x2={ancho - margen.right} y2={gy} className="chart-grid" />
            <text x={margen.left - 8} y={gy} textAnchor="end" dominantBaseline="middle" className="chart-eje-texto">
              {etiqueta}
            </text>
          </g>
        ))}

        <g className={`chart-revelador ${mostrado ? 'mostrado' : ''}`}>
          <polygon points={area('fiado')} className="chart-area-fiado" />
          <polygon points={area('abono')} className="chart-area-abono" />
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
        </g>

        {indicesEjeX.map((i) => (
          <text key={i} x={x(i)} y={alto - 6} textAnchor="middle" className="chart-eje-texto">
            {formatearFechaCorta(datos[i].dia)}
          </text>
        ))}
      </svg>
      <div className="chart-leyenda">
        <span className="chart-leyenda-item">
          <span className="chart-leyenda-punto" style={{ background: 'var(--rojo)' }} />
          Fiado
        </span>
        <span className="chart-leyenda-item">
          <span className="chart-leyenda-punto" style={{ background: 'var(--verde)' }} />
          Abonos
        </span>
      </div>
    </div>
  );
}
