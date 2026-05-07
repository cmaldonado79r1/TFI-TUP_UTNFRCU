const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' || !process.env.MAIL_HOST) {
    // En desarrollo, usar ethereal o simplemente loguear
    return {
      sendMail: async (opts) => {
        console.log('[EMAIL SIMULADO]', JSON.stringify(opts, null, 2));
        return { messageId: 'simulado-' + Date.now() };
      }
    };
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
};

const enviarNotificacion = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'SGCA <noreply@sgca.edu.ar>',
      to,
      subject,
      html,
      text
    });
    console.log('[EMAIL] Enviado a:', to, '| ID:', info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { ok: false, error: err.message };
  }
};

const emailClasePendiente = ({ docente, materia, curso, fecha, claseId, directivos }) => {
  const subject = `[SGCA] Nueva clase pendiente de revisión – ${materia} (${curso})`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dee2e6;border-radius:8px;overflow:hidden">
      <div style="background:#1a3a5c;color:#fff;padding:20px 24px">
        <h2 style="margin:0">📋 SGCA – Nueva Clase Pendiente</h2>
      </div>
      <div style="padding:24px">
        <p>Se ha registrado una nueva clase que requiere su revisión y aprobación.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold;width:40%">Docente</td><td style="padding:8px">${docente}</td></tr>
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Materia</td><td style="padding:8px">${materia}</td></tr>
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Curso</td><td style="padding:8px">${curso}</td></tr>
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Fecha</td><td style="padding:8px">${fecha}</td></tr>
        </table>
        <p style="color:#6c757d;font-size:13px">Ingrese al sistema SGCA para revisar y aprobar o rechazar este registro.</p>
      </div>
      <div style="background:#f8f9fa;padding:12px 24px;font-size:12px;color:#6c757d;text-align:center">
        SGCA – Sistema de Gestión de Contenido Áulico
      </div>
    </div>`;
  return enviarNotificacion({ to: directivos, subject, html });
};

const emailClaseAprobada = ({ docente_email, docente_nombre, materia, fecha, comentarios }) => {
  const subject = `[SGCA] Tu clase fue APROBADA – ${materia}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dee2e6;border-radius:8px;overflow:hidden">
      <div style="background:#198754;color:#fff;padding:20px 24px">
        <h2 style="margin:0">✅ SGCA – Clase Aprobada</h2>
      </div>
      <div style="padding:24px">
        <p>Estimado/a <strong>${docente_nombre}</strong>, su clase ha sido <strong>APROBADA</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold;width:40%">Materia</td><td style="padding:8px">${materia}</td></tr>
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Fecha de clase</td><td style="padding:8px">${fecha}</td></tr>
          ${comentarios ? `<tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Comentarios</td><td style="padding:8px">${comentarios}</td></tr>` : ''}
        </table>
        <p>El registro queda ahora <strong>inmutable</strong> en el sistema.</p>
      </div>
      <div style="background:#f8f9fa;padding:12px 24px;font-size:12px;color:#6c757d;text-align:center">SGCA – Sistema de Gestión de Contenido Áulico</div>
    </div>`;
  return enviarNotificacion({ to: docente_email, subject, html });
};

const emailClaseRechazada = ({ docente_email, docente_nombre, materia, fecha, comentarios }) => {
  const subject = `[SGCA] Tu clase requiere revisión – ${materia}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dee2e6;border-radius:8px;overflow:hidden">
      <div style="background:#dc3545;color:#fff;padding:20px 24px">
        <h2 style="margin:0">⚠️ SGCA – Clase Requiere Revisión</h2>
      </div>
      <div style="padding:24px">
        <p>Estimado/a <strong>${docente_nombre}</strong>, su clase requiere <strong>CORRECCIONES</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold;width:40%">Materia</td><td style="padding:8px">${materia}</td></tr>
          <tr><td style="padding:8px;background:#f8f9fa;font-weight:bold">Fecha de clase</td><td style="padding:8px">${fecha}</td></tr>
          <tr><td style="padding:8px;background:#fff3cd;font-weight:bold">Observaciones</td><td style="padding:8px;background:#fff3cd">${comentarios || 'Sin comentarios adicionales.'}</td></tr>
        </table>
        <p>Por favor ingrese al sistema y realice las correcciones indicadas.</p>
      </div>
      <div style="background:#f8f9fa;padding:12px 24px;font-size:12px;color:#6c757d;text-align:center">SGCA – Sistema de Gestión de Contenido Áulico</div>
    </div>`;
  return enviarNotificacion({ to: docente_email, subject, html });
};

module.exports = { enviarNotificacion, emailClasePendiente, emailClaseAprobada, emailClaseRechazada };
