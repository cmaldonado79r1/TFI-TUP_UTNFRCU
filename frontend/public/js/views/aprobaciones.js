/* ── Vista Aprobaciones ──────────────────────────────────── */
const AprobacionesView = (() => {
  let _todos   = [];   // caché completa de pendientes
  let _sortBy  = 'fecha_creacion';
  let _sortDir = 1;

  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-clipboard2-check me-2"></i>Bandeja de Revisión</h4>
        <button class="btn btn-outline-secondary btn-sm" id="btn-refresh-pend">
          <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
        </button>
      </div>

      <!-- Filtros -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-3">
              <label class="form-label small mb-1">Buscar</label>
              <div class="input-group input-group-sm">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="busq-pend" class="form-control" placeholder="Materia, docente...">
              </div>
            </div>
            <div class="col-sm-3">
              <label class="form-label small mb-1">Docente</label>
              <select id="filtro-pend-docente" class="form-select form-select-sm">
                <option value="">Todos los docentes</option>
              </select>
            </div>
            <div class="col-sm-3">
              <label class="form-label small mb-1">Materia</label>
              <select id="filtro-pend-materia" class="form-select form-select-sm">
                <option value="">Todas las materias</option>
              </select>
            </div>
            <div class="col-sm-2">
              <label class="form-label small mb-1">Ordenar por</label>
              <select id="sort-pend" class="form-select form-select-sm">
                <option value="fecha_creacion:1">Enviado (más antiguo)</option>
                <option value="fecha_creacion:-1">Enviado (más reciente)</option>
                <option value="materia_nombre:1">Materia A→Z</option>
                <option value="docente_nombre:1">Docente A→Z</option>
                <option value="fecha:1">Fecha clase (asc)</option>
                <option value="fecha:-1">Fecha clase (desc)</option>
              </select>
            </div>
            <div class="col-sm-1 d-flex align-items-end">
              <button class="btn btn-outline-secondary btn-sm w-100" id="btn-limpiar-filtros-pend" title="Limpiar">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="pendientes-container"></div>
    </div>`;

    document.getElementById('btn-refresh-pend').addEventListener('click', cargarPendientes);
    document.getElementById('busq-pend').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-pend-docente').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-pend-materia').addEventListener('change', aplicarFiltros);
    document.getElementById('sort-pend').addEventListener('change', () => {
      const [col, dir] = document.getElementById('sort-pend').value.split(':');
      _sortBy = col; _sortDir = parseInt(dir);
      aplicarFiltros();
    });
    document.getElementById('btn-limpiar-filtros-pend').addEventListener('click', () => {
      document.getElementById('busq-pend').value = '';
      document.getElementById('filtro-pend-docente').value = '';
      document.getElementById('filtro-pend-materia').value = '';
      document.getElementById('sort-pend').value = 'fecha_creacion:1';
      _sortBy = 'fecha_creacion'; _sortDir = 1;
      aplicarFiltros();
    });

    cargarPendientes();
  };

  const cargarPendientes = async () => {
    UI.loader('pendientes-container');
    try {
      _todos = await Api.getPendientes();
      poblarFiltros(_todos);
      aplicarFiltros();
    } catch(e) {
      document.getElementById('pendientes-container').innerHTML =
        `<div class="alert alert-danger">Error al cargar pendientes: ${e.message}</div>`;
    }
  };

  /* Rellena los <select> con los valores únicos presentes en la lista */
  const poblarFiltros = (lista) => {
    const docSel = document.getElementById('filtro-pend-docente');
    const matSel = document.getElementById('filtro-pend-materia');
    if (!docSel || !matSel) return;

    const docActual = docSel.value;
    const matActual = matSel.value;

    const docentes = [...new Map(lista.map(c => [c.docente_nombre, c.docente_nombre])).entries()];
    // key única: "materia|||curso" para distinguir homónimas entre cursos
    const materias = [...new Map(lista.map(c => {
      const key = `${c.materia_nombre}|||${c.curso_nombre}`;
      return [key, { key, materia: c.materia_nombre, curso: c.curso_nombre }];
    })).values()];

    docSel.innerHTML = '<option value="">Todos los docentes</option>' +
      docentes.map(([v]) => `<option value="${v}" ${v === docActual ? 'selected' : ''}>${v}</option>`).join('');

    matSel.innerHTML = '<option value="">Todas las materias</option>' +
      materias.map(m =>
        `<option value="${m.key}" ${m.key === matActual ? 'selected' : ''}>${m.materia} — ${m.curso}</option>`
      ).join('');
  };

  /* Filtra + ordena _todos en el cliente y re-renderiza las tarjetas */
  const aplicarFiltros = () => {
    const busq     = (document.getElementById('busq-pend')?.value || '').toLowerCase();
    const docFiltro = document.getElementById('filtro-pend-docente')?.value || '';
    const matFiltro = document.getElementById('filtro-pend-materia')?.value || '';

    let filtrados = _todos.filter(c =>
      (!busq     || c.materia_nombre.toLowerCase().includes(busq) ||
                    c.docente_nombre.toLowerCase().includes(busq) ||
                    c.curso_nombre.toLowerCase().includes(busq)) &&
      (!docFiltro || c.docente_nombre === docFiltro) &&
      (!matFiltro || `${c.materia_nombre}|||${c.curso_nombre}` === matFiltro)
    );

    // Ordenar
    filtrados = filtrados.slice().sort((a, b) => {
      let va = a[_sortBy] ?? '', vb = b[_sortBy] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
    });

    const container = document.getElementById('pendientes-container');
    if (!filtrados.length) {
      UI.empty('pendientes-container',
        _todos.length ? 'Ninguna clase coincide con los filtros seleccionados' : 'No hay clases pendientes de revisión 🎉',
        _todos.length ? 'funnel' : 'check2-circle'
      );
      return;
    }

    container.innerHTML = `
      <div class="row g-3">
        ${filtrados.map(renderTarjetaPendiente).join('')}
      </div>
      <div class="text-muted small mt-2 text-end">
        ${filtrados.length} clase${filtrados.length !== 1 ? 's' : ''}
        ${_todos.length !== filtrados.length ? ` de ${_todos.length}` : ''}
      </div>`;

    container.querySelectorAll('[data-ver-pendiente]').forEach(btn => {
      btn.addEventListener('click', () => ClasesView.verClase(btn.dataset.verPendiente));
    });
    container.querySelectorAll('[data-visar]').forEach(btn => {
      btn.addEventListener('click', () => abrirModalVisar(btn.dataset.visar, btn.dataset.materia, btn.dataset.fecha));
    });
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
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Visando...';
      try {
        const r = await Api.aprobar({ clase_id: claseId, estado: 'APROBADO', comentarios });
        UI.toast(r.message || 'Clase visada correctamente ✓', 'success');
        // Esperar que Bootstrap termine de cerrar el modal antes de recargar el DOM
        const modalEl = document.getElementById('modal-visar');
        modalEl.addEventListener('hidden.bs.modal', () => cargarPendientes(), { once: true });
        modal.hide();
      } catch(err) {
        UI.modalAlert('visar-alert', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-patch-check me-1"></i>Confirmar visado';
      }
    });
  };

  return { render };
})();
