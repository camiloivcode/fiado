import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, Users, Wallet, FileBarChart, Menu, LogOut } from 'lucide-react';
import { api } from '../api.js';
import { borrarToken } from '../sesion.js';

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', Icono: LayoutDashboard },
  { to: '/clientes', etiqueta: 'Clientes', Icono: Users },
  { to: '/caja', etiqueta: 'Caja', Icono: Wallet },
  { to: '/reportes', etiqueta: 'Reportes', Icono: FileBarChart },
];

const FECHA_HOY = new Date().toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long',
});

function activoPara(pathname, to) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function Navegacion({ variante, colapsado }) {
  const location = useLocation();
  const itemRefs = useRef({});
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    function recalcular() {
      const activo = ENLACES.find((e) => activoPara(location.pathname, e.to));
      const el = activo && itemRefs.current[activo.to];
      if (!el) return setRect(null);
      setRect({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
    }
    recalcular();
    window.addEventListener('resize', recalcular);
    // el sidebar tarda ~250ms en transicionar su ancho al colapsar/expandir;
    // se recalcula de nuevo una vez asentado para que el indicador quede exacto.
    const id = setTimeout(recalcular, 280);
    return () => {
      window.removeEventListener('resize', recalcular);
      clearTimeout(id);
    };
  }, [location.pathname, colapsado]);

  return (
    <nav className={`nav nav-${variante}`}>
      {rect && <span className="nav-indicador" style={rect} />}
      {ENLACES.map(({ to, etiqueta, Icono }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          ref={(el) => { itemRefs.current[to] = el; }}
          className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
          title={etiqueta}
          aria-label={etiqueta}
        >
          <Icono className="icono nav-icono" size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-etiqueta">{etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const location = useLocation();
  const pagina = ENLACES.find((e) => e.to === location.pathname);
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('sidebarColapsado') === '1');
  const [conectado, setConectado] = useState(true);

  function alternarSidebar() {
    setColapsado((actual) => {
      const nuevo = !actual;
      localStorage.setItem('sidebarColapsado', nuevo ? '1' : '0');
      return nuevo;
    });
  }

  useEffect(() => {
    let vigente = true;
    async function chequear() {
      try {
        await api.salud();
        if (vigente) setConectado(true);
      } catch {
        if (vigente) setConectado(false);
      }
    }
    chequear();
    const id = setInterval(chequear, 15000);
    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, []);

  async function cerrarSesion() {
    try {
      await api.logout();
    } catch {
      // la sesión ya pudo haber expirado; no impide cerrarla localmente
    }
    borrarToken();
    location.reload();
  }

  return (
    <div className="app-shell">
      <header className="barra-superior">
        <button
          className="btn-colapsar"
          onClick={alternarSidebar}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          <Menu size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <span className="marca">
          <span className="marca-icono" aria-hidden="true">
            <Wallet size={18} strokeWidth={2} />
          </span>
          <span className="marca-texto">Fiado</span>
        </span>
        <span className="barra-superior-derecha">
          <span
            className={`indicador-conexion ${conectado ? '' : 'desconectado'}`}
            title={conectado ? 'Conectado' : 'Sin conexión con el servidor'}
          />
          <span className="barra-superior-fecha">{FECHA_HOY}</span>
          <button className="btn-colapsar" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      </header>
      <div className="shell">
        <aside className={`sidebar ${colapsado ? 'colapsado' : ''}`}>
          <Navegacion variante="sidebar" colapsado={colapsado} />
        </aside>
        <main className="contenido">
          {pagina && (
            <header className="topbar">
              <span className="topbar-icono" aria-hidden="true">
                <pagina.Icono size={20} strokeWidth={1.75} />
              </span>
              <h2 className="topbar-titulo">{pagina.etiqueta}</h2>
            </header>
          )}
          <Outlet />
        </main>
        <Navegacion variante="bottom" />
      </div>
    </div>
  );
}
