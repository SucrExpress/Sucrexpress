'use client';
import React, { useState } from 'react';
import { 
  IoCloseOutline, 
  IoCubeOutline, 
  IoLocationOutline, 
  IoPersonOutline,
  IoCashOutline,
  IoScaleOutline,
  IoCalendarOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoWarningOutline
} from 'react-icons/io5';
import '../../assets/styles/modals.css';

const DetallesPaqueteModal = ({ isOpen, paquete, onClose }) => {
  // Estado para la accion de copiar enlace: null | 'copiado' | 'error'
  const [estadoCopia, setEstadoCopia] = useState(null);

  /**
   * Copia al portapapeles la URL publica de seguimiento de este paquete.
   * Solo incluye el numero de guia; ningun dato del destinatario.
   */
  const copiarEnlaceSeguimiento = async () => {
    try {
      const url =
        window.location.origin +
        '/seguimiento?guia=' +
        encodeURIComponent(paquete?.numero_guia ?? '');
      await navigator.clipboard.writeText(url);
      setEstadoCopia('copiado');
      setTimeout(() => setEstadoCopia(null), 2500);
    } catch {
      setEstadoCopia('error');
      setTimeout(() => setEstadoCopia(null), 3000);
    }
  };

  if (!isOpen || !paquete) return null;

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente:   { class: 'badge-warning', text: 'Pendiente' },
      asignado:    { class: 'badge-info',    text: 'Asignado' },
      // en_ruta es el valor actual en BD; en_transito es el valor heredado
      en_ruta:     { class: 'badge-primary', text: 'En ruta' },
      en_transito: { class: 'badge-primary', text: 'En ruta' },
      entregado:   { class: 'badge-success', text: 'Entregado' },
      fallido:     { class: 'badge-danger',  text: 'Fallido' }
    };

    const badge = badges[estado] || badges.pendiente;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detalles-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <IoCubeOutline size={24} />
            <h2>Detalles del Paquete</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body detalles-body">
          {/* Información del Paquete */}
          <div className="detalles-section">
            <h3 className="detalles-section-title">
              <IoCubeOutline size={18} />
              Información del Paquete
            </h3>
            <div className="detalles-grid">
              <div className="detalles-item">
                <label>Número de Guía</label>
                <div className="detalles-guia-row">
                  <p className="detalles-value font-bold detalles-guia-num">
                    {paquete.numero_guia}
                  </p>
                  <button
                    id="btn-copiar-enlace-seguimiento"
                    type="button"
                    className={`btn-copiar-seguimiento${
                      estadoCopia === 'copiado' ? ' btn-copiar-ok' : ''
                    }${estadoCopia === 'error' ? ' btn-copiar-err' : ''}`}
                    onClick={copiarEnlaceSeguimiento}
                    aria-label="Copiar enlace de seguimiento"
                    title="Copiar enlace de seguimiento publico"
                  >
                    {estadoCopia === 'copiado' ? (
                      <><IoCheckmarkOutline size={15} aria-hidden="true" /> Copiado</>
                    ) : estadoCopia === 'error' ? (
                      <><IoWarningOutline size={15} aria-hidden="true" /> Error al copiar</>
                    ) : (
                      <><IoCopyOutline size={15} aria-hidden="true" /> Copiar enlace</>
                    )}
                  </button>
                </div>
              </div>
              <div className="detalles-item">
                <label>Estado</label>
                <p className="detalles-value">{getEstadoBadge(paquete.estado)}</p>
              </div>
              <div className="detalles-item">
                <label>Contenido</label>
                <p className="detalles-value">{paquete.contenido}</p>
              </div>
              <div className="detalles-item">
                <label>Peso (kg)</label>
                <p className="detalles-value">{parseFloat(paquete.peso).toFixed(2)}</p>
              </div>
              <div className="detalles-item">
                <label>Precio de Envío (Bs.)</label>
                <p className="detalles-value">Bs. {parseFloat(paquete.precio_envio).toFixed(2)}</p>
              </div>
              <div className="detalles-item">
                <label>Nro. Pedido del Cliente</label>
                <p className="detalles-value font-bold">{paquete.nro_pedido_cliente || '-'}</p>
              </div>
            </div>
            {paquete.observaciones && (
              <div className="detalles-observaciones">
                <label>Observaciones</label>
                <p>{paquete.observaciones}</p>
              </div>
            )}
          </div>

          {/* Información del Destinatario */}
          <div className="detalles-section">
            <h3 className="detalles-section-title">
              <IoPersonOutline size={18} />
              Información del Destinatario
            </h3>
            <div className="detalles-grid">
              <div className="detalles-item">
                <label>Nombre Completo</label>
                <p className="detalles-value">{paquete.nombre_destinatario} {paquete.apellido_destinatario}</p>
              </div>
              <div className="detalles-item">
                <label>Cédula de Identidad</label>
                <p className="detalles-value">{paquete.ci_destinatario}</p>
              </div>
              <div className="detalles-item">
                <label>Correo Electrónico</label>
                <p className="detalles-value">{paquete.email_destinatario}</p>
              </div>
              <div className="detalles-item">
                <label>Teléfono</label>
                <p className="detalles-value">{paquete.telefono_destinatario}</p>
              </div>
            </div>
          </div>

          {/* Información de Entrega */}
          <div className="detalles-section">
            <h3 className="detalles-section-title">
              <IoLocationOutline size={18} />
              Información de Entrega
            </h3>
            <div className="detalles-grid">
              <div className="detalles-item full-width">
                <label>Dirección</label>
                <p className="detalles-value">{paquete.direccion_exacta}</p>
              </div>
              <div className="detalles-item">
                <label>Número de Casa</label>
                <p className="detalles-value">{paquete.numero_casa}</p>
              </div>
              <div className="detalles-item">
                <label>Número de Departamento</label>
                <p className="detalles-value">{paquete.numero_departamento || '-'}</p>
              </div>
              <div className="detalles-item">
                <label>Ciudad Destino</label>
                <p className="detalles-value font-bold">{paquete.ciudad_destino}</p>
              </div>
            </div>
          </div>

          {/* Información de Repartidor */}
          {paquete.repartidor_nombre && (
            <div className="detalles-section">
              <h3 className="detalles-section-title">Información de Repartidor</h3>
              <div className="detalles-grid">
                <div className="detalles-item">
                  <label>Repartidor Asignado</label>
                  <p className="detalles-value">{paquete.repartidor_nombre}</p>
                </div>
                <div className="detalles-item">
                  <label>Fecha de Asignación</label>
                  <p className="detalles-value">{formatFecha(paquete.fecha_asignacion)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="detalles-section">
            <h3 className="detalles-section-title">
              <IoCalendarOutline size={18} />
              Fechas
            </h3>
            <div className="detalles-grid">
              <div className="detalles-item">
                <label>Fecha de Creación</label>
                <p className="detalles-value">{formatFecha(paquete.created_at)}</p>
              </div>
              <div className="detalles-item">
                <label>Última Actualización</label>
                <p className="detalles-value">{formatFecha(paquete.updated_at)}</p>
              </div>
              {paquete.fecha_entrega && (
                <div className="detalles-item">
                  <label>Fecha de Entrega</label>
                  <p className="detalles-value">{formatFecha(paquete.fecha_entrega)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetallesPaqueteModal;
