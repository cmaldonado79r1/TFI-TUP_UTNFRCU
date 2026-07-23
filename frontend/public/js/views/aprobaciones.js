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
      document.querySelectorAll('[data-visar]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalVisar(btn.dataset.visar, btn.dataset.materia, btn.dataset.fecha));
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
          <button class="btn btn-sm btn-outline-secondary" data-ver-pendiente="${c.id}">
            <i class="bi bi-eye me-1"></i>Ver
          </button>
          <button class="btn btn-sm btn-primary" data-visar="${c.id}"
            data-materia="${c.materia_nombre}" data-fecha="${UI.fecha(c.fecha)}">
            <i class="bi bi-patch-check me-1"></i>Visar
          </button>
        </div>
      </div>
    </div>`;

  const abrirModalVisar = (claseId, materia, fecha) => {
    // Resetear contenido del modal
    document.getElementById('visar-clase-id').value = claseId;
    document.getElementById('visar-comentarios').value = '';
    document.getElementById('visar-info').textContent = `${materia} — ${fecha}`;
    UI.clearAlert('visar-alert');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-visar'));
    modal.show();

    // cloneNode para evitar acumulación de handlers
    const btnOrig = document.getElementById('btn-confirmar-visar');
    const btn = btnOrig.cloneNode(true);
    btnOrig.parentNode.replaceChild(btn, btnOrig);

    btn.addEventListener('click', async () => {
      const comentarios = document.getElementById('visar-comentarios').value.trim();
      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Visando...';
        const r = await Api.aprobar({ clase_id: claseId, estado: 'APROBADO', comentarios });
        UI.toast(r.message || 'Clase visada correctamente ✓', 'success');
        modal.hide();
        cargarPendientes();
      } catch(err) {
        UI.modalAlert('visar-alert', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-patch-check me-1"></i>Confirmar visado';
      }
    });
  };

  return { render };
})();
