import { useEffect, useRef, useState } from 'react';
import { Receipt, X, MessageCircle, Calendar, ShoppingBag, Download, AlertCircle, Phone, Loader2, Check } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from './Toast.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { compartirFacturaConImagen, descargarImagenFactura } from '../compartirComprobante.js';

export default function FacturaTotalModal({ cliente, tienda, movimientos: movimientosProp, onClose }) {
  const { mostrarExito, mostrarError } = useToast();
  const ticketRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [movimientos, setMovimientos] = useState(movimientosProp || []);
  const [cargandoMovs, setCargandoMovs] = useState(!movimientosProp);
  const [perfilTienda, setPerfilTienda] = useState(tienda || null);

  // Estados para gestión de teléfono y alertas
  const [telefonoCliente, setTelefonoCliente] = useState(cliente?.telefono || '');
  const [mostrarModalTelefono, setMostrarModalTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState(cliente?.telefono || '');
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);
  const [alertaSinWhatsapp, setAlertaSinWhatsapp] = useState(false);

  useEffect(() => {
    if (!perfilTienda) {
      api.perfil()
        .then((p) => { if (p) setPerfilTienda(p); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (movimientosProp) {
      setMovimientos(movimientosProp);
      return;
    }
    if (cliente?.id) {
      setCargandoMovs(true);
      api.movimientosDeCliente(cliente.id)
        .then((datos) => {
          if (Array.isArray(datos)) setMovimientos(datos);
        })
        .catch((err) => {
          console.error('Error al cargar movimientos para factura:', err);
        })
        .finally(() => setCargandoMovs(false));
    }
  }, [cliente?.id, movimientosProp]);

  if (!cliente) return null;

  const nombreTienda = perfilTienda?.nombre || 'Mi Tienda';
  const numeroNequi = perfilTienda?.nequi ? perfilTienda.nequi.trim() : '';
  const numeroSoloDigitos = numeroNequi.replace(/\D/g, '') || numeroNequi;

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const horaHoy = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const fiadosRecientes = (Array.isArray(movimientos) ? movimientos : [])
    .filter((m) => m && m.tipo === 'fiado')
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

  async function handleEnviarWhatsApp(telDirecto) {
    const telAUsar = (telDirecto !== undefined ? telDirecto : telefonoCliente || '').trim();
    const telLimpio = telAUsar.replace(/\D/g, '');

    // 1. Si no tiene teléfono guardado o es inválido, pedirlo en alerta del sistema
    if (!telLimpio || telLimpio.length < 7) {
      setTelefonoInput(telAUsar);
      setMostrarModalTelefono(true);
      return;
    }

    if (!ticketRef.current || enviando) return;
    setEnviando(true);

    try {
      const nombreArchivo = `factura_total_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const textoMensaje = construirTextoCaption();

      // Copiar el texto completo con el número al portapapeles por seguridad
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(textoMensaje);
        }
      } catch {}

      await compartirFacturaConImagen({
        nodoElemento: ticketRef.current,
        titulo: `Factura Total ${nombreTienda} - ${cliente.nombre}`,
        textoMensaje,
        nombreArchivo,
        telefonoCliente: telAUsar,
      });

      mostrarExito('¡Factura enviada con éxito!');
    } catch (err) {
      console.error('Error al compartir factura por WhatsApp:', err);
      // Alerta en el sistema si WhatsApp no está disponible o el número no abre
      setAlertaSinWhatsapp(true);
    } finally {
      setEnviando(false);
    }
  }

  async function handleGuardarTelefonoYEnviar(e) {
    if (e) e.preventDefault();
    const limpio = telefonoInput.replace(/\D/g, '');
    if (!limpio || limpio.length < 7) {
      mostrarError('Ingresa un número de celular válido de al menos 7 dígitos');
      return;
    }

    setGuardandoTelefono(true);
    try {
      const telNuevo = telefonoInput.trim();
      await api.editarCliente(cliente.id, cliente.nombre, telNuevo, cliente.limiteCredito);
      cliente.telefono = telNuevo;
      setTelefonoCliente(telNuevo);
      setMostrarModalTelefono(false);
      mostrarExito('Teléfono guardado');
      // Proceder de inmediato a enviar la factura
      handleEnviarWhatsApp(telNuevo);
    } catch (err) {
      mostrarError('No se pudo guardar el teléfono: ' + err.message);
    } finally {
      setGuardandoTelefono(false);
    }
  }

  async function handleDescargarImagen() {
    if (!ticketRef.current || enviando) return;
    try {
      const nombreArchivo = `factura_total_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      await descargarImagenFactura(ticketRef.current, nombreArchivo);
      mostrarExito('Factura guardada en tu dispositivo');
    } catch (err) {
      console.error(err);
      mostrarError('Error al guardar la imagen');
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="comprobante-dialogo">
        <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar factura">
          <X size={18} strokeWidth={2} />
        </button>

        {/* Tique Térmico Digital de Cuenta Consolidada */}
        <div className="tique-contenedor" ref={ticketRef}>
          <div className="tique-cabecera">
            <span className="tique-icono-marca">
              <Receipt size={22} strokeWidth={2} />
            </span>
            <h3 className="tique-tienda">{nombreTienda}</h3>
            {perfilTienda?.telefono && (
              <span className="tique-telefono-tienda">Tel: {perfilTienda.telefono}</span>
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
            {telefonoCliente && (
              <div className="tique-fila">
                <span className="tique-clave">Teléfono</span>
                <span className="tique-valor">{telefonoCliente}</span>
              </div>
            )}
            <div className="tique-fila">
              <span className="tique-clave">Fecha de corte</span>
              <span className="tique-valor">{fechaHoy}, {horaHoy}</span>
            </div>

            {/* Gran Total a Pagar */}
            <div className="tique-caja-gran-total">
              <span className="tique-gran-total-etiqueta">TOTAL PENDIENTE POR PAGAR</span>
              <strong className="tique-gran-total-monto">{formatearPesos(cliente.saldo)}</strong>
              <span className="tique-gran-total-sub">Moneda oficial: Pesos Colombianos (COP)</span>
            </div>

            {/* Cupo de crédito si aplica */}
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

            {/* Desglose de fiados recientes */}
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

        {/* Acciones: UN SOLO BOTÓN PRINCIPAL DE WHATSAPP */}
        <div className="comprobante-acciones">
          <button
            type="button"
            className="btn-whatsapp-comprobante btn-con-carga"
            onClick={() => handleEnviarWhatsApp()}
            disabled={enviando}
          >
            {enviando ? (
              <>
                <Loader2 size={18} className="icono-girando" strokeWidth={2.5} />
                <span>Generando factura para WhatsApp...</span>
              </>
            ) : (
              <>
                <MessageCircle size={19} strokeWidth={2.5} />
                <span>Enviar Factura por WhatsApp</span>
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

        {/* Modal de Alerta: Falta Teléfono para WhatsApp */}
        {mostrarModalTelefono && (
          <div className="overlay" style={{ zIndex: 1100 }}>
            <form className="dialogo" onSubmit={handleGuardarTelefonoYEnviar} role="dialog" aria-modal="true">
              <div className="dialogo-cabecera">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="dialogo-icono amarillo" style={{ margin: 0 }}>
                    <Phone size={20} strokeWidth={2.2} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Falta número de WhatsApp</h3>
                </div>
                <button
                  type="button"
                  className="btn-cerrar-modal"
                  onClick={() => setMostrarModalTelefono(false)}
                  disabled={guardandoTelefono}
                >
                  <X size={18} />
                </button>
              </div>

              <p className="dialogo-mensaje">
                El cliente <strong>{cliente.nombre}</strong> no tiene un número registrado. Escribe su celular para guardarlo y enviarle la factura por WhatsApp de inmediato:
              </p>

              <div className="campo" style={{ margin: '8px 0' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto-suave)' }}>
                  Número de Celular / WhatsApp:
                </label>
                <div className="input-prefijo-wrap">
                  <span className="prefijo-co">+57</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="300 123 4567"
                    value={telefonoInput}
                    onChange={(e) => setTelefonoInput(e.target.value)}
                    autoFocus
                    disabled={guardandoTelefono}
                  />
                </div>
              </div>

              <div className="dialogo-acciones">
                <button
                  type="button"
                  onClick={() => setMostrarModalTelefono(false)}
                  disabled={guardandoTelefono}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primario btn-con-carga"
                  disabled={guardandoTelefono}
                >
                  {guardandoTelefono ? (
                    <>
                      <Loader2 size={16} className="icono-girando" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar y Enviar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Alerta: Error al abrir WhatsApp o número sin WhatsApp */}
        {alertaSinWhatsapp && (
          <ConfirmDialog
            titulo="Aviso de WhatsApp"
            mensaje={`No se pudo conectar directamente con WhatsApp para el número (${telefonoCliente || 'sin número'}). Por favor verifica que el número tenga WhatsApp activo y que tengas la aplicación instalada en este dispositivo.`}
            textoConfirmar="Cambiar número"
            textoCancelar="Entendido"
            tipoBoton="btn-advertencia"
            tipoIcono="advertencia"
            onConfirmar={() => {
              setAlertaSinWhatsapp(false);
              setTelefonoInput(telefonoCliente);
              setMostrarModalTelefono(true);
            }}
            onCancelar={() => setAlertaSinWhatsapp(false)}
          />
        )}
      </div>
    </div>
  );
}
