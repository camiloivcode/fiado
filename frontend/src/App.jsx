import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Resumen from './pages/Resumen.jsx';
import Clientes from './pages/Clientes.jsx';
import Cliente from './pages/Cliente.jsx';
import Caja from './pages/Caja.jsx';
import Reportes from './pages/Reportes.jsx';
import Cobranzas from './pages/Cobranzas.jsx';
import Ajustes from './pages/Ajustes.jsx';
import { api } from './api.js';
import { leerToken, borrarToken } from './sesion.js';

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = validando token, null = sin sesión

  useEffect(() => {
    let vigente = true;
    async function validar() {
      if (!leerToken()) return setUsuario(null);
      try {
        const u = await api.yo();
        if (vigente) setUsuario(u);
      } catch {
        borrarToken();
        if (vigente) setUsuario(null);
      }
    }
    validar();
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <ToastProvider>
      {usuario === undefined ? null : !usuario ? (
        <Login onIngreso={setUsuario} />
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Resumen />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<Cliente />} />
            <Route path="/cobranzas" element={<Cobranzas />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Route>
        </Routes>
      )}
    </ToastProvider>
  );
}
