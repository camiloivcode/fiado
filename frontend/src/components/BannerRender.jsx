import { useEffect, useState } from 'react';
import { Cloud, Loader2, CheckCircle2, X } from 'lucide-react';

export default function BannerRender() {
  const [estado, setEstado] = useState('inactivo'); // 'inactivo' | 'despertando' | 'conectado'

  useEffect(() => {
    function onColdStart(e) {
      const { activo, conectado } = e.detail || {};
      if (activo) {
        setEstado('despertando');
      } else if (conectado) {
        setEstado('conectado');
        const id = setTimeout(() => setEstado('inactivo'), 2800);
        return () => clearTimeout(id);
      } else {
        setEstado('inactivo');
      }
    }

    window.addEventListener('render-cold-start', onColdStart);
    return () => window.removeEventListener('render-cold-start', onColdStart);
  }, []);

  if (estado === 'inactivo') return null;

  return (
    <div className={`banner-render ${estado}`}>
      <div className="banner-render-contenido">
        {estado === 'despertando' ? (
          <>
            <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
            <div className="banner-render-texto">
              <strong>Conectando con el servidor en Render...</strong>
              <span>El servicio gratuito está arrancando tras reposo. Responderá en unos segundos.</span>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 size={16} strokeWidth={2.5} />
            <div className="banner-render-texto">
              <strong>¡Servidor conectado con éxito!</strong>
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        className="banner-render-cerrar"
        onClick={() => setEstado('inactivo')}
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}
