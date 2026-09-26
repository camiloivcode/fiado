import { formatearPesos } from '../format.js';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function BarraCupo({ saldo, limiteCredito, mostrarTexto = true }) {
  if (!limiteCredito || limiteCredito <= 0) return null;

  const saldoPositivo = Math.max(0, saldo);
  const porcentaje = Math.min(100, Math.round((saldoPositivo / limiteCredito) * 100));
  const excedido = saldoPositivo > limiteCredito;
  const disponible = Math.max(0, limiteCredito - saldoPositivo);

  let estadoClase = 'normal'; // normal | advertencia | peligro
  if (porcentaje >= 100 || excedido) {
    estadoClase = 'peligro';
  } else if (porcentaje >= 75) {
    estadoClase = 'advertencia';
  }

  return (
    <div className={`barra-cupo-envoltura ${estadoClase}`}>
      {mostrarTexto && (
        <div className="barra-cupo-header">
          <span className="barra-cupo-etiqueta">
            {excedido ? (
              <>
                <AlertTriangle size={12} strokeWidth={2.5} className="icono-alerta" />
                <strong>Cupo excedido</strong> (+{formatearPesos(saldoPositivo - limiteCredito)})
              </>
            ) : (
              <>
                <ShieldCheck size={12} strokeWidth={2} />
                Cupo: {formatearPesos(saldoPositivo)} de {formatearPesos(limiteCredito)}
              </>
            )}
          </span>
          <span className="barra-cupo-disponible">
            {excedido ? 'Sin cupo' : `${formatearPesos(disponible)} disponible`}
          </span>
        </div>
      )}
      <div className="barra-cupo-track">
        <div
          className={`barra-cupo-fill ${estadoClase}`}
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>
    </div>
  );
}
