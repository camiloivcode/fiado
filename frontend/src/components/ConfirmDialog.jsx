import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ titulo, mensaje, textoConfirmar = 'Eliminar', onConfirmar, onCancelar }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="dialogo dialogo-confirmar" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo">
        <span className="dialogo-icono rojo" aria-hidden="true">
          <AlertTriangle size={20} strokeWidth={2} />
        </span>
        <h2 id="confirmar-titulo">{titulo}</h2>
        <p className="dialogo-mensaje">{mensaje}</p>
        <div className="dialogo-acciones">
          <button type="button" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn-peligro" onClick={onConfirmar} autoFocus>{textoConfirmar}</button>
        </div>
      </div>
    </div>
  );
}
