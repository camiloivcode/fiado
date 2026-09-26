import { useEffect, useRef, useState } from 'react';
import { Receipt, X, MessageCircle, Calendar, ShoppingBag, Download, AlertCircle, ShieldCheck, Phone, Share2, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from './Toast.jsx';
import { compartirFacturaConImagen, descargarImagenFactura, abrirChatWhatsAppDirecto } from '../compartirComprobante.js';

export default function FacturaTotalModal({ cliente, tienda, movimientos: movimientosProp, onClose }) {
  const { mostrarExito, mostrarError } = useToast();
  const ticketRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [movimientos, setMovimientos] = useState(movimientosProp || []);
  const [cargandoMovs, setCargandoMovs] = useState(!movimientosProp);

  useEffect(() => {
    if (movimientosProp) {
      setMovimientos(movimientosProp);
      return;
    }
    if (cliente?.id) {
      setCargandoMovs(true);
      api.obtenerCliente(cliente.id)
        .then((datos) => {
          if (datos?.movimientos) setMovimientos(datos.movimientos);
        })
        .catch(() => {})
        .finally(() => setCargandoMovs(false));
    }
  }, [cliente?.id, movimientosProp]);

  if (!cliente) return null;

  const nombreTienda = tienda?.nombre || 'Mi Tienda';
  const numeroNequi = tienda?.nequi ? tienda.nequi.trim() : '';
  const numeroSoloDigitos = numeroNequi.replace(/\D/g, '') || numeroNequi;

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const horaHoy = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  // Tomamos los últimos fiados y compras para el desglose (máximo 6 para que quepa bien en el tique)
  const fiadosRecientes = movimientos
    .filter((m) => m.tipo === 'fiado')
    .slice(0, 6);

  function construirTextoCaption() {
    return (
      `🧾 *FACTURA / ESTADO DE CUENTA TOTAL*\n` +
      `🏪 *${nombreTienda}*\n\n` +
      `👤 *Cliente:* ${cliente.nombre}\n` +
      `📅 *Fecha de corte:* ${fechaHoy}\n` +
      `💰 *TOTAL PENDIENTE POR PAGAR:* ${formatearPesos(cliente.saldo)} COP\n\n` +
      (numeroSoloDigitos ?
        `📲 *Número de cuenta para transferencia:*\n` +
        `*NEQUI o BRE-B (No Daviplata):*\n` +
        `${numeroSoloDigitos}\n` +
        `_(Mantén presionado el número para copiarlo y pegarlo en tu Nequi o Bre-B)_\n\n`
        : '') +
      `Agradecemos tu pronto abono para mantener tu cuenta y crédito al día. ¡Muchas gracias!`
    );
  }

  async function handleCompartirWhatsApp() {
    if (!ticketRef.current || enviando) return;
    setEnviando(true);
    try {
      const nombreArchivo = `factura_total_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const textoMensaje = construirTextoCaption();

      await compartirFacturaConImagen({
        nodoElemento: ticketRef.current,
        titulo: `Factura Total ${nombreTienda} - ${cliente.nombre}`,
        textoMensaje,
        nombreArchivo,
        telefonoCliente: cliente.telefono,
      });

      mostrarExito('¡Factura enviada con éxito!');
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo generar la imagen de la factura');
    } finally {
      setEnviando(false);
    }
  }

  function handleAbrirWhatsAppDirecto() {
    if (!cliente.telefono) {
      mostrarError('Este cliente no tiene teléfono guardado');
      return;
    }
    const textoMensaje = construirTextoCaption();
    abrirChatWhatsAppDirecto(cliente.telefono, textoMensaje);
    mostrarExito(`Abriendo chat con ${cliente.nombre}...`);
  }

  async function handleDescargarImagen() {
    if (!ticketRef.current || enviando) return;
    try {
      const nombreArchivo = `factura_total_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      await descargarImagenFactura(ticketRef.current, nombreArchivo);
      mostrarExito('Factura guardada');
    } catch (err) {
      console.error(err);
      mostrarError('Error al descargar la imagen');
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="comprobante-dialogo">
        <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar factura">
          <X size={18} strokeWidth={2} />
        </button>

        {/* Diseño tipo Tique Térmico Digital de Cuenta Consolidada */}
        <div className="tique-contenedor" ref={ticketRef}>
          <div className="tique-cabecera">
            <span className="tique-icono-marca">
              <Receipt size={22} strokeWidth={2} />
            </span>
            <h3 className="tique-tienda">{nombreTienda}</h3>
            {tienda?.telefono && (
              <span className="tique-telefono-tienda">Tel: {tienda.telefono}</span>
            )}
            <span className="tique-tipo-badge factura-total">
              Factura de Saldo Total
            </span>
          </div>

          <div className="tique-divisor-punteado" />

          <div className="tique-filas">
            <div className="tique-fila">
              <span className="tique-clave">Cliente</span>
              <strong className="tique-valor">{cliente.nombre}</strong>
            </div>
            {cliente.telefono && (
              <div className="tique-fila">
                <span className="tique-clave">Teléfono</span>
                <span className="tique-valor">{cliente.telefono}</span>
              </div>
            )}
            <div className="tique-fila">
              <span className="tique-clave">Fecha de emisión</span>
              <span className="tique-valor">{fechaHoy}, {horaHoy}</span>
            </div>

            {/* Gran Total a Pagar */}
            <div className="tique-caja-gran-total">
              <span className="tique-gran-total-etiqueta">TOTAL PENDIENTE POR PAGAR</span>
              <strong className="tique-gran-total-monto">{formatearPesos(cliente.saldo)}</strong>
              <span className="tique-gran-total-sub">Moneda oficial: Pesos Colombianos (COP)</span>
            </div>

            {/* Si tiene cupo configurado */}
            {cliente.limiteCredito > 0 && (
              <div className="tique-fila" style={{ fontSize: 12, padding: '4px 0' }}>
                <span className="tique-clave">Cupo asignado: {formatearPesos(cliente.limiteCredito)}</span>
                <span className="tique-valor" style={{ color: (cliente.limiteCredito - cliente.saldo) < 0 ? '#dc2626' : '#059669' }}>
                  {(cliente.limiteCredito - cliente.saldo) < 0
                    ? `Excedido por ${formatearPesos(Math.abs(cliente.limiteCredito - cliente.saldo))}`
                    : `Disponible: ${formatearPesos(cliente.limiteCredito - cliente.saldo)}`}
                </span>
              </div>
            )}

            {/* Desglose de fiados / compras recientes */}
            {fiadosRecientes.length > 0 && (
              <div className="tique-desglose-seccion">
                <div className="tique-desglose-titulo">
                  <span>Compras / Fiados recientes:</span>
                </div>
                <div className="tique-desglose-items">
                  {fiadosRecientes.map((f) => (
                    <div key={f.id} className="tique-desglose-item">
                      <div className="tique-desglose-item-info">
                        <span className="tique-desglose-item-fecha">
                          {new Date(f.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="tique-desglose-item-desc">
                          {f.descripcion || 'Compra / Fiado'}
                        </span>
                      </div>
                      <span className="tique-desglose-item-monto">
                        +{formatearPesos(f.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Caja destacada para pago Nequi / Bre-B (No Daviplata) */}
          {numeroNequi && (
            <div className="tique-caja-pago">
              <div className="tique-pago-encabezado">
                <span className="tique-pago-titulo">TRANSFERENCIAS NEQUI / BRE-B</span>
                <span className="tique-pago-alerta">(No se recibe Daviplata)</span>
              </div>
              <div className="tique-pago-numero-box">
                <span className="tique-pago-etiqueta">Número para pagar:</span>
                <strong className="tique-pago-numero">{numeroNequi}</strong>
              </div>
              <span className="tique-pago-indicacion">Puedes copiar este número para transferir desde tu Nequi o Bre-B</span>
            </div>
          )}

          <div className="tique-pie-agradecimiento">
            Agradecemos su puntual pago para mantener su cuenta al día.
          </div>

          <div className="tique-borde-zigzag" />
        </div>

        {/* Acciones */}
        <div className="comprobante-acciones">
          {cliente.telefono ? (
            <button
              type="button"
              className="btn-whatsapp-directo-cliente btn-con-carga"
              onClick={handleAbrirWhatsAppDirecto}
              disabled={enviando}
            >
              <MessageCircle size={18} strokeWidth={2.5} />
              <span>Abrir WhatsApp directo con {cliente.nombre}</span>
            </button>
          ) : (
            <div className="tique-aviso-telefono">
              <AlertCircle size={15} />
              <span>Sin teléfono guardado. Usa el botón abajo para compartir la factura.</span>
            </div>
          )}

          <button
            type="button"
            className="btn-whatsapp-comprobante btn-con-carga"
            onClick={handleCompartirWhatsApp}
            disabled={enviando}
          >
            {enviando ? (
              <>
                <Loader2 size={16} className="icono-girando" strokeWidth={2.5} />
                <span>Generando imagen de la factura...</span>
              </>
            ) : (
              <>
                <Share2 size={16} strokeWidth={2.2} />
                <span>Compartir Imagen de la Factura (PNG)</span>
              </>
            )}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secundario btn-con-carga"
              onClick={handleDescargarImagen}
              disabled={enviando}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Download size={15} /> Descargar Imagen
            </button>
            <button
              type="button"
              className="btn-secundario"
              onClick={onClose}
              disabled={enviando}
              style={{ flex: 1 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
