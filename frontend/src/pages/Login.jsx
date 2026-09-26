import { useEffect, useState } from 'react';
import { Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../api.js';
import { guardarToken } from '../sesion.js';
import { useToast } from '../components/Toast.jsx';

export default function Login({ onIngreso }) {
  const { mostrarError, mostrarExito } = useToast();
  const [esSetup, setEsSetup] = useState(false);
  const [comprobando, setComprobando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function verificarEstado() {
      try {
        const estado = await api.estadoAuth();
        if (estado && estado.inicializado === false) {
          setEsSetup(true);
        }
      } catch {
        // En caso de fallo de red al verificar estado, se mantiene el login por defecto
      } finally {
        setComprobando(false);
      }
    }
    verificarEstado();
  }, []);

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      if (esSetup) {
        const { token, usuario } = await api.setupAuth(email.trim(), nombre.trim(), clave);
        guardarToken(token);
        mostrarExito('¡Sistema configurado exitosamente!');
        onIngreso(usuario);
      } else {
        const { token, usuario } = await api.login(email.trim(), clave);
        guardarToken(token);
        onIngreso(usuario);
      }
    } catch (error) {
      mostrarError(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card form-caja" onSubmit={enviar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="login-icono" aria-hidden="true">
            {esSetup ? <ShieldCheck size={22} strokeWidth={2} /> : <Wallet size={22} strokeWidth={2} />}
          </span>
          <div>
            <h1 className="login-titulo" style={{ margin: 0, fontSize: 20 }}>
              {esSetup ? 'Primer inicio' : 'Fiado'}
            </h1>
            <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
              {esSetup ? 'Crea la cuenta del dueño / tendero' : 'Control de crédito y caja para tu tienda'}
            </span>
          </div>
        </div>

        {esSetup && (
          <div className="campo">
            <label htmlFor="login-nombre">Tu nombre o nombre del negocio</label>
            <input
              id="login-nombre"
              type="text"
              placeholder="Ej: Carmen Gómez / Tienda Doña Carmen"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              required
              autoFocus
            />
          </div>
        )}

        <div className="campo">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            placeholder="usuario@ejemplo.com"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
            autoFocus={!esSetup}
          />
        </div>

        <div className="campo">
          <label htmlFor="login-clave">Contraseña</label>
          <input
            id="login-clave"
            type="password"
            placeholder={esSetup ? 'Mínimo 8 caracteres' : '••••••••'}
            autoComplete={esSetup ? 'new-password' : 'current-password'}
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
            required
            minLength={esSetup ? 8 : undefined}
          />
        </div>

        <button type="submit" className="btn-primario" disabled={enviando || comprobando} style={{ marginTop: 8 }}>
          {enviando ? 'Procesando…' : esSetup ? 'Inicializar y entrar' : 'Ingresar a mi negocio'}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
