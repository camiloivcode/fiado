import { useEffect, useRef, useState } from 'react';
import { Receipt, X, MessageCircle, Calendar, ShoppingBag, Download, Check, Sparkles, AlertCircle, Phone, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { formatearPesos } from '../format.js';
import { useToast } from './Toast.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { compartirFacturaConImagen, descargarImagenFactura } from '../compartirComprobante.js';

export default function ComprobanteModal({ movimiento, cliente, tienda, onClose }) {
  const { mostrarExito, mostrarError } = useToast();
  const ticketRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
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

  if (!movimiento || !cliente) return null;

  const esFiado = movimiento.tipo === 'fiado';
  const fechaObj = new Date(movimiento.fecha);
  const fechaStr = fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const horaStr = fechaObj.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const nombreTienda = perfilTienda?.nombre || 'Mi Tienda';
  const numeroNequi = perfilTienda?.nequi ? perfilTienda.nequi.trim() : '';
  const numeroSoloDigitos = numeroNequi.replace(/\D/g, '') || numeroNequi;

  function construirTextoCaption() {
    return (
      `🧾 *COMPROBANTE DE ${esFiado ? 'COMPRA (FIADO)' : 'ABONO'}*\n` +
      `🏪 *${nombreTienda}*\n\n` +
      `👤 *Cliente:* ${cliente.nombre}\n` +
      `📅 *Fecha:* ${fechaStr} - ${horaStr}\n` +
      `${movimiento.descripcion ? `📦 *Detalle:* ${movimiento.descripcion}\n` : ''}` +
      `💰 *Valor ${esFiado ? 'fiado' : 'abonado'}:* ${formatearPesos(movimiento.monto)}\n` +
      `📊 *Saldo total actual:* ${formatearPesos(cliente.saldo)}\n\n` +
      (numeroSoloDigitos ?
        `📲 *Para pagar por NEQUI o BRE-B (No Daviplata):*\n` +
        `${numeroSoloDigitos}\n` +
        `_(Mantén presionado el número para copiar y pegar en tu Nequi o Bre-B)_\n\n`
        : '') +
      `¡Muchas gracias por su preferencia!`
    );
  }

  async function handleEnviarWhatsApp(telDirecto) {
    const telAUsar = (telDirecto !== undefined ? telDirecto : telefonoCliente || '').trim();
    const telLimpio = telAUsar.replace(/\D/g, '');

    // Si el cliente no tiene número, alertar en el sistema y permitir agregarlo de una vez
    if (!telLimpio || telLimpio.length < 7) {
      setTelefonoInput(telAUsar);
      setMostrarModalTelefono(true);
      return;
    }

    if (!ticketRef.current || enviando) return;
    setEnviando(true);

    try {
      const nombreArchivo = `recibo_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const textoMensaje = construirTextoCaption();

      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(textoMensaje);
        }
      } catch {}

      await compartirFacturaConImagen({
        nodoElemento: ticketRef.current,
        titulo: `Recibo ${nombreTienda} - ${cliente.nombre}`,
        textoMensaje,
        nombreArchivo,
        telefonoCliente: telAUsar,
      });

      mostrarExito('¡Comprobante enviado con éxito!');
    } catch (err) {
      console.error('Error al compartir comprobante por WhatsApp:', err);
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
      // Proceder de inmediato a enviar el comprobante
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
      const nombreArchivo = `recibo_${cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      await descargarImagenFactura(ticketRef.current, nombreArchivo);
      mostrarExito('Comprobante guardado en tu dispositivo');
    } catch (err) {
      console.error(err);
      mostrarError('Error al guardar la imagen');
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="comprobante-dialogo">
        <button className="btn-cerrar-modal" onClick={onClose} aria-label="Cerrar comprobante">
          <X size={18} strokeWidth={2} />
        </button>

        {/* Diseño tipo Tique Térmico Digital */}
        <div className="tique-contenedor" ref={ticketRef}>
          <div className="tique-cabecera">
            <span className="tique-icono-marca">
              <Receipt size={22} strokeWidth={2} />
            </span>
            <h3 className="tique-tienda">{nombreTienda}</h3>
            {perfilTienda?.telefono && (
              <span className="tique-telefono-tienda">Tel: {perfilTienda.telefono}</span>
            )}
            <span className={`tique-tipo-badge ${esFiado ? 'fiado' : 'abono'}`}>
              {esFiado ? 'Tique de Fiado' : 'Tique de Abono'}
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
              <span className="tique-clave">Fecha y Hora</span>
              <span className="tique-valor">{fechaStr}, {horaStr}</span>
            </div>

            {movimiento.descripcion && (
              <div className="tique-seccion-detalle">
                <span className="tique-clave" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShoppingBag size={12} strokeWidth={2} /> Detalle de lo llevado:
                </span>
                <p className="tique-texto-descripcion">{movimiento.descripcion}</p>
              </div>
            )}

            <div className="tique-fila tique-total-fila">
              <span className="tique-clave">Monto {esFiado ? 'Fiado' : 'Abonado'}</span>
              <strong className={`tique-monto-grande ${esFiado ? 'fiado' : 'abono'}`}>
                {esFiado ? '+' : '-'}{formatearPesos(movimiento.monto)}
              </strong>
            </div>

            <div className="tique-fila tique-saldo-fila">
              <span className="tique-clave">Saldo total actual</span>
              <span className="tique-saldo-actual">{formatearPesos(cliente.saldo)}</span>
            </div>
          </div>

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
            ¡Gracias por preferirnos! Guarde este recibo como soporte de su cuenta.
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
                <span>Generando recibo para WhatsApp...</span>
              </>
            ) : (
              <>
                <MessageCircle size={19} strokeWidth={2.5} />
                <span>Enviar Recibo por WhatsApp</span>
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
                El cliente <strong>{cliente.nombre}</strong> no tiene un número registrado. Escribe su celular para guardarlo y enviarle su recibo por WhatsApp:
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
