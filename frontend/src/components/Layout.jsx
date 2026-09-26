import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, Users, Wallet, FileBarChart, BellRing, Settings, Menu, LogOut, Plus, Calendar, Store, Receipt, ArrowLeft } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { api } from '../api.js';
import { borrarToken } from '../sesion.js';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';
import ModalFiarRapido from './ModalFiarRapido.jsx';
import ComprobanteModal from './ComprobanteModal.jsx';

const ENLACES = [
  { to: '/', etiqueta: 'Resumen', Icono: LayoutDashboard },
  { to: '/clientes', etiqueta: 'Clientes', Icono: Users },
  { to: '/cobranzas', etiqueta: 'Cobranzas', Icono: BellRing },
  { to: '/caja', etiqueta: 'Caja', Icono: Wallet },
  { to: '/reportes', etiqueta: 'Reportes', Icono: FileBarChart },
  { to: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
];

const FECHA_HOY = new Date().toLocaleDateString('es-CO', {
  weekday: 'short', day: 'numeric', month: 'short',
});

function activoPara(pathname, to) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function Navegacion({ variante, colapsado, onFiarClick }) {
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
          <Icono className="icono nav-icono" size={19} strokeWidth={1.8} aria-hidden="true" />
          <span className="nav-etiqueta">{etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pagina = ENLACES.find((e) => e.to === location.pathname);
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('sidebarColapsado') === '1');
  const [conectado, setConectado] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [modalFiarAbierto, setModalFiarAbierto] = useState(false);
  const [comprobanteActivo, setComprobanteActivo] = useState(null); // { movimiento, cliente }

  // Soporte para botón "Atrás" de hardware (Android/Tablet) y tecla Escape
  useEffect(() => {
    let listener = null;

    async function registrarBotonAtras() {
      try {
        listener = await CapApp.addListener('backButton', () => {
          // 1. Si el modal de fiar está abierto, cerrarlo
          if (modalFiarAbierto) {
            setModalFiarAbierto(false);
            return;
          }
          // 2. Si el comprobante está abierto, cerrarlo
          if (comprobanteActivo) {
            setComprobanteActivo(null);
            return;
          }
          // 3. Si hay cualquier otro diálogo modal/overlay abierto en la pantalla
          const overlay = document.querySelector('.overlay');
          if (overlay) {
            const btnCerrar = overlay.querySelector('.btn-cerrar-modal, .dialogo-acciones button[type="button"]');
            if (btnCerrar) {
              btnCerrar.click();
              return;
            }
            overlay.click();
            return;
          }
          // 4. Si estamos en una subpantalla (ej: /clientes/:id, /cobranzas, /caja), volver atrás
          if (location.pathname !== '/') {
            navigate(-1);
            return;
          }
          // 5. Si ya estamos en la raíz '/', salir o enviar a background
          CapApp.exitApp();
        });
      } catch {
        // En entorno de navegador estándar
      }
    }

    registrarBotonAtras();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (modalFiarAbierto) return setModalFiarAbierto(false);
        if (comprobanteActivo) return setComprobanteActivo(null);
        const overlay = document.querySelector('.overlay');
        if (overlay) {
          const btnCerrar = overlay.querySelector('.btn-cerrar-modal, .dialogo-acciones button[type="button"]');
          if (btnCerrar) btnCerrar.click();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (listener) listener.remove();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalFiarAbierto, comprobanteActivo, location.pathname, navigate]);

  function alternarSidebar() {
    setColapsado((actual) => {
      const nuevo = !actual;
      localStorage.setItem('sidebarColapsado', nuevo ? '1' : '0');
      return nuevo;
    });
  }

  async function chequear() {
    try {
      await api.salud();
      setConectado(true);
      if (!usuario) {
        const u = await api.yo();
        setUsuario(u);
      }
    } catch {
      setConectado(false);
    }
  }

  useEffect(() => { chequear(); }, []);
  useRefrescarAlEnfocar(chequear);

  async function cerrarSesion() {
    try {
      await api.logout();
    } catch {
      // la sesión ya pudo haber expirado; no impide cerrarla localmente
    }
    borrarToken();
    location.reload();
  }

  function alGuardarFiado(movimiento, cliente) {
    setComprobanteActivo({ movimiento, cliente });
  }

  const esRaiz = location.pathname === '/';

  return (
    <div className="app-shell">
      <header className="barra-superior">
        {/* Botón Atrás en Header para Tablets y Móvil */}
        {!esRaiz && (
          <button
            type="button"
            className="btn-header-atras"
            onClick={() => navigate(-1)}
            aria-label="Volver a la pantalla anterior"
            title="Volver"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="btn-header-atras-texto">Atrás</span>
          </button>
        )}

        <button
          className="btn-colapsar"
          onClick={alternarSidebar}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          <Menu size={20} strokeWidth={2} aria-hidden="true" />
        </button>

        <Link to="/" style={{ textDecoration: 'none' }} className="marca">
          <span className="marca-icono" aria-hidden="true">
            <Wallet size={18} strokeWidth={2} />
          </span>
          <span className="marca-texto">Fiado</span>
        </Link>

        {usuario?.nombre && (
          <span className="tienda-pill" title="Negocio activo">
            <span className="tienda-punto" aria-hidden="true" />
            <span>{usuario.nombre}</span>
          </span>
        )}

        <span className="barra-superior-derecha">
          <button
            type="button"
            className="btn-fiar-rapido"
            onClick={() => setModalFiarAbierto(true)}
            title="Registrar fiado rápido"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span style={{ display: 'inline' }}>Fiar</span>
          </button>
          <span
            className={`indicador-conexion ${conectado ? '' : 'desconectado'}`}
            title={conectado ? 'Conectado al servidor' : 'Sin conexión con el servidor'}
          />
          <span className="barra-superior-fecha" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
            {FECHA_HOY}
          </span>
          <button className="btn-colapsar" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      </header>
      <div className="shell">
        <aside className={`sidebar ${colapsado ? 'colapsado' : ''}`}>
          <Navegacion variante="sidebar" colapsado={colapsado} />
          <div className="sidebar-footer">
            <div className="sidebar-turno-badge">
              <span className="tienda-punto" aria-hidden="true" />
              <span>Turno: Caja Abierta</span>
            </div>
            {usuario?.nombre && (
              <span style={{ fontSize: 11, opacity: 0.7, paddingLeft: 4 }}>
                {usuario.nombre}
              </span>
            )}
          </div>
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

      {/* Botón flotante para celular (FAB) */}
      <button
        type="button"
        className="fab-fiar-movil"
        onClick={() => setModalFiarAbierto(true)}
        aria-label="Registrar fiado rápido"
      >
        <Plus size={22} strokeWidth={2.5} />
        <span>Fiar</span>
      </button>

      {/* Modal global de fiado rápido */}
      {modalFiarAbierto && (
        <ModalFiarRapido
          onClose={() => setModalFiarAbierto(false)}
          onGuardado={alGuardarFiado}
        />
      )}

      {/* Modal de Comprobante / Tique */}
      {comprobanteActivo && (
        <ComprobanteModal
          movimiento={comprobanteActivo.movimiento}
          cliente={comprobanteActivo.cliente}
          tienda={usuario}
          onClose={() => setComprobanteActivo(null)}
        />
      )}
    </div>
  );
}
