import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Resumen from './pages/Resumen.jsx';
import Clientes from './pages/Clientes.jsx';
import Cliente from './pages/Cliente.jsx';
import Caja from './pages/Caja.jsx';
import Reportes from './pages/Reportes.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Resumen />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<Cliente />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/reportes" element={<Reportes />} />
      </Route>
    </Routes>
  );
}
