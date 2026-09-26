import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, CreditCard, Save, Download, LogOut, Check, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { borrarToken } from '../sesion.js';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function Ajustes() {
  const navigate = useNavigate();
  const { mostrarError, mostrarExito } = useToast();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nequi, setNequi] = useState('');
  const [email, setEmail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const u = await api.perfil();
        if (u) {
          setNombre(u.nombre || '');
          setTelefono(u.telefono || '');
          setNequi(u.nequi || '');
          setEmail(u.email || '');
        }
      } catch (e) {
        mostrarError(e.message);
      }
    }
    cargar();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    if (!nombre.trim()) return mostrarError('El nombre de la tienda es obligatorio');
    setGuardando(true);
    try {
      await api.actualizarPerfil({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        nequi: nequi.trim(),
      });
      mostrarExito('Ajustes guardados correctamente');
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function exportarCopiaSeguridad() {
    setExportando(true);
    try {
      const [clientes, caja] = await Promise.all([
        api.listarClientes(),
        api.listarCaja(),
      ]);

      const backup = {
        tienda: { nombre, telefono, nequi },
        fechaExportacion: new Date().toISOString(),
        clientes,
        caja,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `respaldo_fiado_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      mostrarExito('Respaldo descargado');
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setExportando(false);
    }
  }

  function cerrarSesion() {
    borrarToken();
    window.location.reload();
  }

  return (
    <div className="pagina">
      <button className="btn-volver" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
        <ArrowLeft size={16} strokeWidth={2} /> Volver
      </button>

      {/* 1. Datos de la Tienda / Negocio */}
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">
            <Store size={18} strokeWidth={2} style={{ verticalAlign: -3, marginRight: 6 }} />
            Perfil de la Tienda
          </h3>
        </div>
        <div className="panel-cuerpo">
          <form className="form-caja" onSubmit={guardar}>
            <div className="campo">
              <label htmlFor="tienda-nombre">Nombre de la Tienda o Negocio</label>
              <input
                id="tienda-nombre"
                type="text"
                placeholder="Ej: Tienda Doña Carmen"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
              <span className="campo-ayuda">Este nombre aparecerá en la cabecera y en los comprobantes de WhatsApp.</span>
            </div>

            <div className="campo">
              <label htmlFor="tienda-telefono">Teléfono / WhatsApp de la Tienda</label>
              <input
                id="tienda-telefono"
                type="tel"
                placeholder="Ej: 300 123 4567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="tienda-nequi">Número Nequi / Bre-B para recibir abonos (No Daviplata)</label>
              <input
                id="tienda-nequi"
                type="text"
                placeholder="Ej: 310 987 6543"
                value={nequi}
                onChange={(e) => setNequi(e.target.value)}
              />
              <span className="campo-ayuda">Se incluirá en la factura con imagen y en el texto de WhatsApp para que el cliente copie y pegue el número directamente en su app de Nequi o Bre-B.</span>
            </div>

            <button type="submit" className="btn-primario btn-con-carga" disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
                  <span>Guardando ajustes...</span>
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={2} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* 2. Respaldo de Datos */}
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">
            <Shield size={18} strokeWidth={2} style={{ verticalAlign: -3, marginRight: 6 }} />
            Copia de Seguridad y Datos
          </h3>
        </div>
        <div className="panel-cuerpo">
          <p style={{ fontSize: 14, color: 'var(--texto-suave)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Descarga una copia completa de todos tus clientes, deudas registradas y movimientos de caja en formato JSON.
          </p>
          <button
            type="button"
            className="btn-secundario btn-con-carga"
            onClick={exportarCopiaSeguridad}
            disabled={exportando}
            style={{ padding: '10px 16px', fontWeight: 600 }}
          >
            {exportando ? (
              <>
                <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
                <span>Generando archivo...</span>
              </>
            ) : (
              <>
                <Download size={16} strokeWidth={2} />
                <span>Exportar Copia de Seguridad (.json)</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. Cuenta y Sesión */}
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">Cuenta y Sesión</h3>
        </div>
        <div className="panel-cuerpo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--texto-suave)', display: 'block' }}>Usuario autenticado</span>
            <strong style={{ fontSize: 15, color: 'var(--texto)' }}>{email}</strong>
          </div>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => setConfirmarLogout(true)}
            style={{ color: 'var(--rojo)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
          >
            <LogOut size={16} strokeWidth={2} /> Cerrar Sesión
          </button>
        </div>
      </section>

      {/* Confirmación de cierre de sesión */}
      {confirmarLogout && (
        <ConfirmDialog
          titulo="¿Cerrar sesión?"
          mensaje="¿Estás seguro de que deseas salir del sistema? Tendrás que iniciar sesión nuevamente con tu correo y clave."
          textoConfirmar="Sí, cerrar sesión"
          textoCancelar="Continuar en la app"
          tipoBoton="btn-peligro"
          tipoIcono="advertencia"
          onConfirmar={cerrarSesion}
          onCancelar={() => setConfirmarLogout(false)}
        />
      )}
    </div>
  );
}
