import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { api } from '../api.js';
import { guardarToken } from '../sesion.js';
import { useToast } from '../components/Toast.jsx';

export default function Login({ onIngreso }) {
  const { mostrarError } = useToast();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const { token, usuario } = await api.login(email.trim(), clave);
      guardarToken(token);
      onIngreso(usuario);
    } catch (error) {
      mostrarError(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card form-caja" onSubmit={enviar}>
        <span className="login-icono" aria-hidden="true">
          <Wallet size={22} strokeWidth={2} />
        </span>
        <h1 className="login-titulo">Fiado</h1>
        <div className="campo">
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="login-clave">Contraseña</label>
          <input
            id="login-clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primario" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
