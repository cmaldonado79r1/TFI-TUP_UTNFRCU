/* ── Vista Aprobaciones ──────────────────────────────────── */
const AprobacionesView = (() => {
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-clipboard2-check me-2"></i>Bandeja de Revisión</h4>
        <button class="btn btn-outline-secondary btn-sm" id="btn-refresh-pend"><i class="bi bi-arrow-clockwise me-1"></i>Actualizar</button>
      </div>
      <div id="pendientes-container"></div>
    </div>`;
    document.getElementById('btn-refresh-pend').addEventListener('click', cargarPendientes);
    cargarPendientes();
  };

  const cargarPendientes = async () => {
    UI.loader('pendientes-container');
    try {
      const pendientes = await Api.getPendientes();
      if (!pendientes.length) {
        UI.empty('pendientes-container', 'No hay clases pendientes de revisión 🎉', 'check2-circle');
        return;
      }
      document.getElementById('pendientes-container').innerHTML = `
        <div class="row g-3">
          ${pendientes.map(renderTarjetaPendiente).join('')}
        </div>`;
      document.querySelectorAll('[data-ver-pendiente]').forEach(btn => {
        btn.addEventListener('click', () => ClasesView.verClase(btn.dataset.verPendiente));
      });
      document.querySelectorAll('[data-aprobar]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalAprobacion(btn.dataset.aprobar, 'APROBADO'));
      });
      document.querySelectorAll('[data-rechazar]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalAprobacion(btn.dataset.rechazar, 'RECHAZADO'));
      });
    } catch(e) {
      document.getElementById('pendientes-container').innerHTML =
        `<div class="alert alert-danger">Error al cargar pendientes: ${e.message}</div>`;
    }
  };

  const renderTarjetaPendiente = (c) => `
    <div class="col-lg-6 col-xl-4">
      <div class="card shadow-sm border-warning h-100">
        <div class="card-header bg-warning bg-opacity-10 d-flex justify-content-between align-items-center py-2">
          <div>
            <span class="fw-bold">${c.materia_nombre}</span>
            <small class="text-muted ms-2">${c.materia_codigo || ''}</small>
          </div>
          ${UI.estadoBadge(c.estado)}
        </div>
        <div class="card-body py-3">
          <div class="row g-1 small mb-2">
            <div class="col-5 text-muted">Curso:</div>      <div class="col-7 fw-semibold">${c.curso_nombre} – ${c.turno}</div>
            <div class="col-5 text-muted">Docente:</div>    <div class="col-7">${c.docente_nombre}</div>
            <div class="col-5 text-muted">Fecha:</div>      <div class="col-7">${UI.fecha(c.fecha)}</div>
            <div class="col-5 text-muted">Enviado:</div>    <div class="col-7 text-muted">${UI.fechaHora(c.fecha_creacion)}</div>
            <div class="col-5 text-muted">Temas:</div>      <div class="col-7"><span class="badge bg-secondary">${c.total_temas}</span></div>
          </div>
        </div>
        <div class="card-footer bg-transparent d-flex gap-2 justify-content-end py-2">
          <button class="btn btn-sm btn-outline-secondary" data-ver-pendiente="${c.id}"><i class="bi bi-eye me-1"></i>Ver</button>
          <button class="btn btn-sm btn-danger" data-rechazar="${c.id}"><i class="bi bi-x-circle me-1"></i>Rechazar</button>
          <button class="btn btn-sm btn-success" data-aprobar="${c.id}"><i class="bi bi-check-circle me-1"></i>Aprobar</button>
        </div>
      </div>
    </div>`;

  const abrirModalAprobacion = (claseId, estado) => {
    const esAprobacion = estado === 'APROBADO';
    const header = document.getElementById('modal-aprobacion-header');
    header.className = `modal-header ${esAprobacion ? 'bg-success text-white' : 'bg-danger text-white'}`;
    document.getElementById('modal-aprobacion-title').textContent = esAprobacion ? '✅ Aprobar Clase' : '❌ Rechazar Clase';
    document.getElementById('aprobacion-clase-id').value = claseId;
    document.getElementById('aprobacion-estado').value = estado;
    document.getElementById('aprobacion-comentarios').value = '';
    UI.clearAlert('aprobacion-alert');

    const btnConfirmar = document.getElementById('btn-confirmar-aprobacion');
    btnConfirmar.className = `btn ${esAprobacion ? 'btn-success' : 'btn-danger'}`;
    btnConfirmar.textContent = esAprobacion ? 'Confirmar aprobación' : 'Confirmar rechazo';

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-aprobacion'));
    modal.show();

    btnConfirmar.onclick = async () => {
      const comentarios = document.getElementById('aprobacion-comentarios').value.trim();
      if (!esAprobacion && !comentarios) {
        UI.modalAlert('aprobacion-alert', 'Debe ingresar un comentario al rechazar una clase', 'warning');
        return;
      }
      try {
        btnConfirmar.disabled = true;
        const r = await Api.aprobar({ clase_id: claseId, estado, comentarios });
        UI.toast(r.message, 'success');
        modal.hide();
        cargarPendientes();
      } catch(err) {
        UI.modalAlert('aprobacion-alert', err.message);
      } finally {
        btnConfirmar.disabled = false;
      }
    };
  };

  return { render };
})();
