import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, MessageCircle, AlertTriangle, Search, ChevronRight, Phone, ShieldCheck, DollarSign, ArrowLeft, Receipt } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos, claseAvatar } from '../format.js';
import { useToast } from '../components/Toast.jsx';
import BarraCupo from '../components/BarraCupo.jsx';
import FacturaTotalModal from '../components/FacturaTotalModal.jsx';
import useRefrescarAlEnfocar from '../useRefrescarAlEnfocar.js';

function diasSinActividad(ultimaActividad) {
  if (!ultimaActividad) return null;
  return Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 86_400_000);
}

export default function Cobranzas() {
  const navigate = useNavigate();
  const { mostrarError } = useToast();
  const [clientes, setClientes] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [tab, setTab] = useState('mora'); // 'mora' | 'cupo' | 'todos'
  const [clienteParaFactura, setClienteParaFactura] = useState(null);

  async function cargar() {
    try {
      const [lista, datosPerfil] = await Promise.all([
        api.listarClientes(),
        api.perfil().catch(() => null),
      ]);
      setClientes(lista);
      setPerfil(datosPerfil);
    } catch (e) {
      mostrarError(e.message);
    }
  }

  useEffect(() => { cargar(); }, []);
  useRefrescarAlEnfocar(cargar);

  const deudores = clientes.filter((c) => c.saldo > 0);
  const deudoresEnMora = deudores.filter((c) => (diasSinActividad(c.ultimaActividad) ?? 0) >= 30);
  const deudoresCupoExcedido = deudores.filter((c) => c.limiteCredito > 0 && c.saldo > c.limiteCredito);

  const totalCartera = deudores.reduce((acc, c) => acc + c.saldo, 0);
  const totalEnMora = deudoresEnMora.reduce((acc, c) => acc + c.saldo, 0);

  const filtrados = deudores.filter((c) => {
    const coincide = c.nombre.toLowerCase().includes(filtro.toLowerCase()) || (c.telefono && c.telefono.includes(filtro));
    if (!coincide) return false;
    if (tab === 'mora') return (diasSinActividad(c.ultimaActividad) ?? 0) >= 30;
    if (tab === 'cupo') return c.limiteCredito > 0 && c.saldo > c.limiteCredito;
    return true;
  }).sort((a, b) => b.saldo - a.saldo);

  function generarMensajeCobro(c) {
    const tienda = perfil?.nombre || 'Mi Tienda';
    const dias = diasSinActividad(c.ultimaActividad);
    const nequiTxt = perfil?.nequi ? `\n💳 Puedes pagar por Nequi/Daviplata al: ${perfil.nequi}` : '';

    const mensaje = encodeURIComponent(
      `Hola ${c.nombre}, cordial saludo de parte de *${tienda}*.\n\n` +
      `Te recordamos amablemente tu saldo pendiente por valor de *${formatearPesos(c.saldo)} COP*${dias ? ` (último movimiento hace ${dias} días)` : ''}.\n` +
      `Agradecemos tu pronto abono para mantener tu cuenta al día.${nequiTxt}\n\n` +
      `¡Muchas gracias!`
    );

    const tel = (c.telefono || '').replace(/\D/g, '');
    return tel ? `https://wa.me/${tel.startsWith('57') ? tel : `57${tel}`}?text=${mensaje}` : null;
  }

  return (
    <div className="pagina">
      <button className="btn-volver" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
        <ArrowLeft size={16} strokeWidth={2} /> Volver al Resumen
      </button>

      {/* 1. Métricas de Cartera */}
      <div className="cobranzas-kpis-grid">
        <div className="cobranzas-kpi-card alerta">
          <div className="cobranzas-kpi-icono">
            <Clock size={20} strokeWidth={2} />
          </div>
          <div>
            <span className="cobranzas-kpi-etiqueta">Cartera en Mora (&gt;30 días)</span>
            <strong className="cobranzas-kpi-valor">{formatearPesos(totalEnMora)}</strong>
            <span className="cobranzas-kpi-sub">{deudoresEnMora.length} {deudoresEnMora.length === 1 ? 'cliente retrasado' : 'clientes retrasados'}</span>
          </div>
        </div>

        <div className="cobranzas-kpi-card">
          <div className="cobranzas-kpi-icono" style={{ color: 'var(--rojo)', background: 'var(--rojo-suave)' }}>
            <DollarSign size={20} strokeWidth={2} />
          </div>
          <div>
            <span className="cobranzas-kpi-etiqueta">Total Deuda por Cobrar</span>
            <strong className="cobranzas-kpi-valor">{formatearPesos(totalCartera)}</strong>
            <span className="cobranzas-kpi-sub">En {deudores.length} cuentas pendientes</span>
          </div>
        </div>

        <div className="cobranzas-kpi-card">
          <div className="cobranzas-kpi-icono" style={{ color: 'var(--ambar)', background: 'var(--ambar-suave)' }}>
            <AlertTriangle size={20} strokeWidth={2} />
          </div>
          <div>
            <span className="cobranzas-kpi-etiqueta">Cupos Excedidos</span>
            <strong className="cobranzas-kpi-valor">{deudoresCupoExcedido.length}</strong>
            <span className="cobranzas-kpi-sub">Superaron el límite fijado</span>
          </div>
        </div>
      </div>

      {/* 2. Pestañas de Filtrado */}
      <div className="filtros-tabs">
        <button
          type="button"
          className={`tab-filtro alerta ${tab === 'mora' ? 'activo' : ''}`}
          onClick={() => setTab('mora')}
        >
          En Mora (&gt;30d) <span className="badge-contador">{deudoresEnMora.length}</span>
        </button>
        <button
          type="button"
          className={`tab-filtro ${tab === 'cupo' ? 'activo' : ''}`}
          onClick={() => setTab('cupo')}
        >
          Cupo Excedido <span className="badge-contador">{deudoresCupoExcedido.length}</span>
        </button>
        <button
          type="button"
          className={`tab-filtro ${tab === 'todos' ? 'activo' : ''}`}
          onClick={() => setTab('todos')}
        >
          Todos los Deudores <span className="badge-contador">{deudores.length}</span>
        </button>
      </div>

      <div className="buscador-envoltura" style={{ marginBottom: 16 }}>
        <Search className="buscador-icono" size={18} strokeWidth={1.75} />
        <input
          type="search"
          className="buscador"
          placeholder="Buscar deudor para cobrar por WhatsApp..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* 3. Lista de Cobranzas */}
      <section className="panel">
        <div className="panel-cabecera">
          <h3 className="panel-titulo">
            {tab === 'mora' ? 'Clientes con Deuda Vencida' : tab === 'cupo' ? 'Clientes con Cupo Superado' : 'Directorio de Cobro'}
          </h3>
          <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
            {filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        <div className="panel-cuerpo sin-relleno">
          <div className="lista-cobranzas">
            {filtrados.map((c) => {
              const dias = diasSinActividad(c.ultimaActividad);
              const urlWA = generarMensajeCobro(c);

              return (
                <div key={c.id} className="tarjeta-cobranza-item">
                  <div className="cobranza-cliente-col">
                    <span className={`avatar ${claseAvatar(c.nombre)}`} style={{ width: 40, height: 40 }}>
                      {c.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="cobranza-info">
                      <Link to={`/clientes/${c.id}`} className="cobranza-nombre">
                        {c.nombre} <ChevronRight size={14} className="icono-chevron" />
                      </Link>
                      {c.telefono ? (
                        <span className="cobranza-telefono">
                          <Phone size={12} /> {c.telefono}
                        </span>
                      ) : (
                        <span className="cobranza-sin-telefono">Sin teléfono registrado</span>
                      )}
                      {dias !== null && (
                        <span className={`badge-dias-mora ${dias >= 30 ? 'mora-grave' : ''}`}>
                          <Clock size={11} /> {dias} días sin abonos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cobranza-saldo-col">
                    <span className="cobranza-saldo-etiqueta">Debe</span>
                    <strong className="cobranza-saldo-monto">{formatearPesos(c.saldo)}</strong>
                    {c.limiteCredito > 0 && (
                      <BarraCupo saldo={c.saldo} limiteCredito={c.limiteCredito} mostrarTexto={false} />
                    )}
                  </div>

                  <div className="cobranza-accion-col">
                    <button
                      type="button"
                      className="btn-whatsapp-cobro"
                      onClick={() => setClienteParaFactura(c)}
                      title="Generar y enviar factura de cobro con imagen por WhatsApp"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Receipt size={15} strokeWidth={2.2} /> Cobrar con Factura
                    </button>
                  </div>
                </div>
              );
            })}

            {!filtrados.length && (
              <div className="vacio" style={{ padding: '36px 16px' }}>
                <ShieldCheck size={36} strokeWidth={1.5} color="var(--verde)" />
                <p style={{ marginTop: 8, fontWeight: 600 }}>¡Excelente! No hay deudas pendientes en este filtro.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal de Factura Total / Estado de Cuenta para Cobro */}
      {clienteParaFactura && (
        <FacturaTotalModal
          cliente={clienteParaFactura}
          tienda={perfil}
          onClose={() => setClienteParaFactura(null)}
        />
      )}
    </div>
  );
}
