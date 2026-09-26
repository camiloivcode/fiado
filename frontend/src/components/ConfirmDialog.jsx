import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tipoBoton = 'btn-peligro',
  tipoIcono = 'peligro', // 'peligro' | 'advertencia' | 'info' | 'exito'
  cargando = false,
  onConfirmar,
  onCancelar,
}) {
  function renderIcono() {
    if (tipoIcono === 'advertencia') {
      return <AlertTriangle size={22} strokeWidth={2.2} />;
    }
    if (tipoIcono === 'info') {
      return <HelpCircle size={22} strokeWidth={2.2} />;
    }
    if (tipoIcono === 'exito') {
      return <CheckCircle size={22} strokeWidth={2.2} />;
    }
    return <AlertCircle size={22} strokeWidth={2.2} />;
  }

  const claseIcono =
    tipoIcono === 'advertencia' ? 'amarillo' :
    tipoIcono === 'info' ? 'azul' :
    tipoIcono === 'exito' ? 'verde' : 'rojo';

  return (
    <div
      className="overlay"
      onClick={(e) => !cargando && e.target === e.currentTarget && onCancelar()}
    >
      <div
        className="dialogo dialogo-confirmar"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
      >
        <span className={`dialogo-icono ${claseIcono}`} aria-hidden="true">
          {renderIcono()}
        </span>
        <h2 id="confirmar-titulo">{titulo}</h2>
        <p className="dialogo-mensaje">{mensaje}</p>
        <div className="dialogo-acciones">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`${tipoBoton} btn-con-carga`}
            onClick={onConfirmar}
            disabled={cargando}
            autoFocus
          >
            {cargando ? (
              <>
                <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
                <span>Procesando...</span>
              </>
            ) : (
              <span>{textoConfirmar}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
