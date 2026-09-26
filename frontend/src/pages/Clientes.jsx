import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UsersRound, UserPlus, Clock, ChevronLeft, ChevronRight, Rows3, Phone, MessageCircle, X, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

const DIAS_ALERTA = 30;
const POR_PAGINA = 10;

function diasSinActividad(ultimaActividad) {
  if (!ultimaActividad) return null;
  return Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 86_400_000);
}

export default function Clientes() {
  const navigate = useNavigate();
  const { mostrarError, mostrarExito } = useToast();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [tabActivo, setTabActivo] = useState('todos'); // 'todos' | 'deuda' | 'al-dia' | 'mora'
  const [pagina, setPagina] = useState(1);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [limiteNuevo, setLimiteNuevo] = useState('');
  const [compacta, setCompacta] = useState(() => localStorage.getItem('densidadCompacta') === '1');

  function alternarDensidad() {
    setCompacta((actual) => {
      const nuevo = !actual;
      localStorage.setItem('densidadCompacta', nuevo ? '1' : '0');
      return nuevo;
    });
  }

  async function cargar() {
    try {
      setClientes(await api.listarClientes());
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);
  useRefrescarAlEnfocar(cargar);

  async function crearCliente(evento) {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre || guardandoNuevo) return;
    setGuardandoNuevo(true);
    try {
      await api.crearCliente(nombre, telefonoNuevo.trim(), Number(limiteNuevo) || 0);
      setNombreNuevo('');
      setTelefonoNuevo('');
      setLimiteNuevo('');
      setMostrarModal(false);
      mostrarExito('Cliente creado');
      cargar();
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setGuardandoNuevo(false);
    }
  }

  // Métricas y conteos de tabs
  const conteoConDeuda = clientes.filter((c) => c.saldo > 0).length;
  const conteoAlDia = clientes.filter((c) => c.saldo <= 0).length;
  const conteoEnMora = clientes.filter((c) => c.saldo > 0 && (diasSinActividad(c.ultimaActividad) ?? 0) >= DIAS_ALERTA).length;
  const totalPorCobrar = clientes.reduce((acc, c) => acc + (c.saldo > 0 ? c.saldo : 0), 0);

  const filtrados = clientes
    .filter((c) => {
      const coincideBusqueda =
        c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (c.telefono && c.telefono.includes(filtro));
      if (!coincideBusqueda) return false;

      if (tabActivo === 'deuda') return c.saldo > 0;
      if (tabActivo === 'al-dia') return c.saldo <= 0;
      if (tabActivo === 'mora') {
        const dias = diasSinActividad(c.ultimaActividad);
        return c.saldo > 0 && dias !== null && dias >= DIAS_ALERTA;
      }
      return true;
    })
    .sort((a, b) => b.saldo - a.saldo);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function buscar(valor) {
    setFiltro(valor);
    setPagina(1);
  }

  function cambiarTab(nuevoTab) {
    setTabActivo(nuevoTab);
    setPagina(1);
  }

  return (
    <div className="pagina">
      <button className="btn-volver" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
        <ArrowLeft size={16} strokeWidth={2} /> Volver
      </button>

      <header className="pagina-cabecera" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600 }}>
            {clientes.length} cuentas registradas • {formatearPesos(totalPorCobrar)} por cobrar
          </span>
        </div>
        <button className="btn-primario" onClick={() => setMostrarModal(true)}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" /> Nuevo Cliente
        </button>
      </header>

      <div className="buscador-envoltura">
        <Search className="buscador-icono" size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          className="buscador"
          placeholder="Buscar cliente por nombre o teléfono... (⌘K)"
          value={filtro}
          onChange={(e) => buscar(e.target.value)}
        />
      </div>

      <div className="filtros-tabs">
        <button
          type="button"
          className={`tab-filtro ${tabActivo === 'todos' ? 'activo' : ''}`}
          onClick={() => cambiarTab('todos')}
        >
          Todos <span className="badge-contador">{clientes.length}</span>
        </button>
        <button
          type="button"
          className={`tab-filtro ${tabActivo === 'deuda' ? 'activo' : ''}`}
          onClick={() => cambiarTab('deuda')}
        >
          Con Deuda <span className="badge-contador">{conteoConDeuda}</span>
        </button>
        <button
          type="button"
          className={`tab-filtro ${tabActivo === 'al-dia' ? 'activo' : ''}`}
          onClick={() => cambiarTab('al-dia')}
        >
          Al Día <span className="badge-contador">{conteoAlDia}</span>
        </button>
        <button
          type="button"
          className={`tab-filtro alerta ${tabActivo === 'mora' ? 'activo' : ''}`}
          onClick={() => cambiarTab('mora')}
        >
          En Mora &gt;30d <span className="badge-contador">{conteoEnMora}</span>
        </button>
      </div>

      {cargando ? (
        <section className="panel">
          <div className="panel-cabecera">
            <div className="skeleton" style={{ width: 140, height: 16 }} />
          </div>
          <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '999px', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ width: '45%', height: 14 }} />
                  <div className="skeleton" style={{ width: '28%', height: 11 }} />
                </div>
                <div className="skeleton" style={{ width: 75, height: 22, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </section>
      ) : filtrados.length > 0 ? (
        <section className="panel">
          <div className="panel-cabecera" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
              Mostrando {filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}
            </span>
            <button type="button" className="btn-secundario" onClick={alternarDensidad}>
              <Rows3 size={15} strokeWidth={2} aria-hidden="true" /> {compacta ? 'Vista normal' : 'Vista compacta'}
            </button>
          </div>
          <div className="panel-cuerpo sin-relleno">
            <div className="tabla-reporte-wrap">
              <table className={`tabla-reporte tabla-clientes ${compacta ? 'compacta' : ''}`}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th className="col-monto">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((c) => {
                    const estado = c.saldo > 0 ? 'debe' : c.saldo < 0 ? 'favor' : 'neutro';
                    const dias = diasSinActividad(c.ultimaActividad);
                    const debeHaceRato = estado === 'debe' && dias !== null && dias >= DIAS_ALERTA;
                    const ir = () => navigate(`/clientes/${c.id}`);
                    return (
                      <tr
                        key={c.id}
                        tabIndex={0}
                        onClick={ir}
                        onKeyDown={(e) => e.key === 'Enter' && ir()}
                      >
                        <td>
                          <div className="celda-cliente">
                            <span className={`avatar ${claseAvatar(c.nombre)}`} aria-hidden="true">
                              {c.nombre.slice(0, 2).toUpperCase()}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="nombre">{c.nombre}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {c.telefono && (
                                  <span style={{ fontSize: 12, color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Phone size={11} strokeWidth={1.5} /> {c.telefono}
                                  </span>
                                )}
                                {c.limiteCredito > 0 && (
                                  <span className="cupo-badge-mini" title={`Cupo máximo: ${formatearPesos(c.limiteCredito)}`}>
                                    Cupo: {formatearPesos(c.limiteCredito)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`pill pill-${estado}`}>
                            {estado === 'debe' ? 'Debe' : estado === 'favor' ? 'A favor' : 'Al día'}
                          </span>
                          {debeHaceRato && (
                            <span className="pill pill-alerta" title={`Sin abonos ni compras hace ${dias} días`}>
                              <Clock size={11} strokeWidth={2} aria-hidden="true" /> {dias}d
                            </span>
                          )}
                        </td>
                        <td className="col-monto">
                          <span className={`saldo ${estado}`}>{formatearPesos(Math.abs(c.saldo))}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPaginas > 1 && (
            <div className="paginador">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> Anterior
              </button>
              <span className="paginador-texto">Página {paginaActual} de {totalPaginas}</span>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="vacio">
          <UsersRound className="icono" size={32} strokeWidth={1.5} aria-hidden="true" />
          {filtro ? 'No se encontraron clientes con esa búsqueda.' : 'Sin clientes todavía en esta lista.'}
        </div>
      )}

      {mostrarModal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setMostrarModal(false)}>
          <form className="dialogo" onSubmit={crearCliente}>
            <div className="dialogo-cabecera">
              <span className="dialogo-icono" aria-hidden="true">
                <UserPlus size={20} strokeWidth={2} />
              </span>
              <h2 style={{ flex: 1 }}>Nuevo Cliente</h2>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModal(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="campo">
              <label htmlFor="nombre-nuevo-cliente" style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                Nombre completo *
              </label>
              <input
                id="nombre-nuevo-cliente"
                type="text"
                autoFocus
                placeholder="Ej: Don Pedro Gómez"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                required
                style={{ textAlign: 'left', fontSize: 15 }}
              />
            </div>
            <div className="campo">
              <label htmlFor="telefono-nuevo-cliente" style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                Teléfono / WhatsApp (opcional)
              </label>
              <input
                id="telefono-nuevo-cliente"
                type="tel"
                placeholder="Ej: 312 456 7890"
                value={telefonoNuevo}
                onChange={(e) => setTelefonoNuevo(e.target.value)}
                style={{ textAlign: 'left', fontSize: 15 }}
              />
            </div>
            <div className="campo">
              <label htmlFor="limite-nuevo-cliente" style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                Cupo máximo de crédito ($ COP, opcional)
              </label>
              <input
                id="limite-nuevo-cliente"
                type="number"
                placeholder="Ej: 100000 (0 para sin límite)"
                value={limiteNuevo}
                onChange={(e) => setLimiteNuevo(e.target.value)}
                style={{ textAlign: 'left', fontSize: 15 }}
              />
              <span className="campo-ayuda">Puedes dejarlo vacío o definir un cupo para alertarte si lo excede.</span>
            </div>
            <div className="dialogo-acciones" style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setMostrarModal(false)} disabled={guardandoNuevo}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primario btn-con-carga"
                disabled={guardandoNuevo || !nombreNuevo.trim()}
              >
                {guardandoNuevo ? (
                  <>
                    <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
                    <span>Guardando cliente...</span>
                  </>
                ) : (
                  <span>Guardar Cliente</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
