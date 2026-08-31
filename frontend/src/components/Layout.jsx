import { NavLink, Outlet } from 'react-router-dom';
import { ToastProvider } from './Toast.jsx';

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', icono: '📊' },
  { to: '/clientes', etiqueta: 'Clientes', icono: '👥' },
  { to: '/caja', etiqueta: 'Caja', icono: '💰' },
  { to: '/reportes', etiqueta: 'Reportes', icono: '📅' },
];

function Navegacion({ variante }) {
  return (
    <nav className={`nav nav-${variante}`}>
      {ENLACES.map((e) => (
        <NavLink
          key={e.to}
          to={e.to}
          end={e.to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
        >
          <span className="nav-icono" aria-hidden="true">{e.icono}</span>
          <span className="nav-etiqueta">{e.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <h1 className="marca">Fiado</h1>
          <Navegacion variante="sidebar" />
        </aside>
        <main className="contenido">
          <Outlet />
        </main>
        <Navegacion variante="bottom" />
      </div>
    </ToastProvider>
  );
}
