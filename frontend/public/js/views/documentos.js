/* ── Vista Documentos ─────────────────────────────────────── */
const DocumentosView = (() => {

  /* ── Estado local para búsqueda/orden ── */
  let _otros    = [];  // caché tab Otros
  let _sortOtros    = 'fecha'; let _sortDirOtros    = -1;
  let _pendientes = [];  // caché tab Pendientes
  let _sortPend     = 'fecha'; let _sortDirPend     = -1;

  const sortIconD = (col, by, dir) =>
    by !== col ? 'bi-arrow-down-up text-muted' : (dir === 1 ? 'bi-arrow-up' : 'bi-arrow-down');

  const render = async () => {
    const user = App.getUser();
    const mc = document.getElementById('main-content');
    const puedeRevisar = ['DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR'].includes(user.rol);

    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="mb-0 fw-bold text-primary-custom">
            <i class="bi bi-folder2-open me-2"></i>Documentos y Programas
          </h4>
          <p class="text-muted small mb-0 mt-1">Gestión de programas con historial de versiones y flujo de aprobación</p>
        </div>
        ${user.rol === 'DOCENTE' ? `
        <button class="btn btn-success px-4" id="btn-subir-doc-btn">
          <i class="bi bi-upload me-1"></i>Cargar documento
        </button>` : ''}
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-4" id="docs-tabs">
        <li class="nav-item">
          <a class="nav-link active" data-docs-tab="programas" href="#">
            <i class="bi bi-journal-bookmark me-1"></i>Programas
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" data-docs-tab="otros" href="#">
            <i class="bi bi-files me-1"></i>Otros documentos
          </a>
        </li>
        ${puedeRevisar ? `
        <li class="nav-item">
          <a class="nav-link" data-docs-tab="pendientes" href="#">
            <i class="bi bi-hourglass-split me-1"></i>Pendientes de revisión
            <span class="badge bg-warning text-dark ms-1" id="badge-docs-pendientes" style="display:none"></span>
          </a>
        </li>` : ''}
      </ul>

      <div id="docs-tab-content"></div>
    </div>`;

    if (user.rol === 'DOCENTE') {
      document.getElementById('btn-subir-doc-btn').addEventListener('click', () => abrirModalSubir());
    }

    document.querySelectorAll('[data-docs-tab]').forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('[data-docs-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.docsTab;
        if (which === 'programas') renderTabProgramas();
        else if (which === 'otros')  renderTabOtros();
        else if (which === 'pendientes') renderTabPendientes();
      });
    });

    renderTabProgramas();
    if (puedeRevisar) actualizarBadgePendientes();
  };

  /* ─── Tab: Programas por materia (4 paneles) ─────────────── */
  const renderTabProgramas = async () => {
    const cont = document.getElementById('docs-tab-content');
    cont.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;
    try {
      const materias = await Api.getMaterias();
      if (!materias.length) {
        UI.empty('docs-tab-content', 'No hay materias asignadas', 'journal-x');
        return;
      }

      // Cargar todos los documentos tipo PROGRAMA de una vez
      const todosLosDocs = await Api.getDocumentos({ tipo: 'PROGRAMA' }).catch(() => []);

      // Agrupar por materia
      const docsPorMateria = {};
      todosLosDocs.forEach(d => {
        if (!docsPorMateria[d.materia_id]) docsPorMateria[d.materia_id] = [];
        docsPorMateria[d.materia_id].push(d);
      });

      cont.innerHTML = `
        <div class="row g-4">
          ${materias.map(m => {
            const docs = docsPorMateria[m.id] || [];
            const vigente = docs.find(d => d.es_vigente) || docs[0] || null;
            return renderTarjetaMateria(m, vigente, docs);
          }).join('')}
        </div>`;

      // Eventos ver versiones
      document.querySelectorAll('[data-ver-versiones]').forEach(btn => {
        btn.addEventListener('click', () => abrirPanelVersiones(btn.dataset.verVersiones, btn.dataset.nombreMateria, btn.dataset.cursoNombre));
      });
      // Eventos nueva versión
      document.querySelectorAll('[data-nueva-version]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalSubir(btn.dataset.nuevaVersion, 'PROGRAMA'));
      });
      // Eventos revisar
      document.querySelectorAll('[data-revisar-doc]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalRevisar(btn.dataset.revisarDoc, btn.dataset.docNombre));
      });
    } catch(e) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const renderTarjetaMateria = (materia, vigente, todasVersiones) => {
    const user = App.getUser();
    const puedeRevisar = ['DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR'].includes(user.rol);
    const esDocente = user.rol === 'DOCENTE';

    const estadoBadge = vigente ? estadoDocBadge(vigente.estado) : '';
    const hayPendiente = todasVersiones.some(d => d.estado === 'PENDIENTE' || d.estado === 'REVISION_REQUERIDA');

    return `
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm h-100 border-0" style="border-left: 4px solid var(--sgca-primary, #2563EB) !important;">
          <div class="card-body p-0">

            <!-- Panel 1: Materia -->
            <div class="px-4 pt-3 pb-2 border-bottom bg-light rounded-top">
              <div class="d-flex align-items-start justify-content-between">
                <div>
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing:.05em">Materia</span>
                  <h5 class="mb-0 fw-bold mt-1">${materia.nombre}</h5>
                  <div class="d-flex align-items-center gap-2 mt-1">
                    <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
                      <i class="bi bi-mortarboard me-1"></i>${materia.curso_nombre || '—'}
                    </span>
                    ${materia.horas_semanales ? `<span class="text-muted small">${materia.horas_semanales}h/sem</span>` : ''}
                  </div>
                </div>
                <div class="text-end">
                  ${vigente ? estadoBadge : '<span class="badge bg-secondary">Sin programa</span>'}
                  ${hayPendiente && puedeRevisar ? '<br><span class="badge bg-warning text-dark mt-1"><i class="bi bi-bell-fill me-1"></i>Requiere revisión</span>' : ''}
                </div>
              </div>
            </div>

            <!-- Panel 2: Programa vigente -->
            <div class="px-4 py-3 border-bottom">
              <span class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.05em">
                <i class="bi bi-file-earmark-text me-1"></i>Programa vigente
              </span>
              ${vigente ? `
              <div class="mt-2 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div>
                  <span class="fw-semibold">${vigente.nombre_original || vigente.nombre_archivo}</span>
                  <span class="badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 ms-2">v${vigente.version}</span>
                  <div class="text-muted small mt-1">
                    Subido ${UI.fecha(vigente.fecha_creacion)} · ${vigente.subido_por_nombre}
                    ${vigente.revisado_por_nombre ? ` · Revisado por ${vigente.revisado_por_nombre}` : ''}
                  </div>
                  ${vigente.estado === 'REVISION_REQUERIDA' && vigente.comentario_revision ? `
                  <div class="alert alert-warning py-1 px-2 mt-2 mb-0 small">
                    <i class="bi bi-chat-left-text me-1"></i><strong>Observación:</strong> ${vigente.comentario_revision}
                  </div>` : ''}
                </div>
                <div class="d-flex gap-1 flex-shrink-0">
                  <button class="btn btn-sm btn-outline-primary" onclick="DocumentosView._descargar('${vigente.id}','${vigente.nombre_original}')" title="Descargar">
                    <i class="bi bi-download"></i>
                  </button>
                  ${puedeRevisar && (vigente.estado === 'PENDIENTE' || vigente.estado === 'REVISION_REQUERIDA') ? `
                  <button class="btn btn-sm btn-warning"
                          data-revisar-doc="${vigente.id}"
                          data-doc-nombre="${vigente.nombre_original}">
                    <i class="bi bi-clipboard2-check me-1"></i>Revisar
                  </button>` : ''}
                  ${esDocente && vigente.estado === 'REVISION_REQUERIDA' ? `
                  <button class="btn btn-sm btn-success"
                          data-nueva-version="${materia.id}">
                    <i class="bi bi-arrow-repeat me-1"></i>Nueva versión
                  </button>` : ''}
                </div>
              </div>` : `
              <div class="text-muted small mt-2 py-2">
                <i class="bi bi-file-earmark-x me-1"></i>No hay programa cargado aún.
                ${esDocente ? `
                <button class="btn btn-sm btn-success ms-2"
                        data-nueva-version="${materia.id}">
                  <i class="bi bi-plus-lg me-1"></i>Cargar programa
                </button>` : ''}
              </div>`}
            </div>

            <!-- Panel 3 + 4: Versiones e historial -->
            <div class="px-4 py-2">
              <div class="d-flex align-items-center justify-content-between">
                <span class="text-muted small">
                  <i class="bi bi-clock-history me-1"></i>
                  ${todasVersiones.length} versión${todasVersiones.length !== 1 ? 'es' : ''} en historial
                </span>
                ${todasVersiones.length > 0 ? `
                <button class="btn btn-link btn-sm text-decoration-none p-0 text-primary"
                        data-ver-versiones="${materia.id}"
                        data-nombre-materia="${materia.nombre}"
                        data-curso-nombre="${materia.curso_nombre || ''}">
                  Ver historial completo <i class="bi bi-chevron-right"></i>
                </button>` : ''}
              </div>
            </div>

          </div>
        </div>
      </div>`;
  };

  /* ─── Panel lateral: versiones de un programa ────────────── */
  const abrirPanelVersiones = async (materiaId, nombreMateria, cursoNombre) => {
    // Usar el modal genérico grande
    document.getElementById('modal-versiones-title').textContent =
      `${nombreMateria} — ${cursoNombre}`;
    const body = document.getElementById('modal-versiones-body');
    body.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-versiones'));
    modal.show();

    try {
      const versiones = await Api.getVersionesDocumento(materiaId);
      if (!versiones.length) {
        body.innerHTML = `<p class="text-muted text-center py-4">No hay versiones registradas</p>`;
        return;
      }

      const user = App.getUser();
      const puedeRevisar = ['DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR'].includes(user.rol);
      const esDocente = user.rol === 'DOCENTE';

      body.innerHTML = `
        <div class="timeline-versiones">
          ${versiones.map((v, idx) => `
          <div class="d-flex gap-3 mb-4 ${idx < versiones.length - 1 ? 'pb-4 border-bottom' : ''}">
            <!-- indicador de versión -->
            <div class="flex-shrink-0 text-center" style="width:48px">
              <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white mx-auto"
                   style="width:40px;height:40px;background:${estadoDocColor(v.estado)}">
                v${v.version}
              </div>
              ${idx < versiones.length - 1 ? '<div class="mx-auto" style="width:2px;height:100%;background:#dee2e6;min-height:24px;margin-top:4px"></div>' : ''}
            </div>
            <!-- contenido -->
            <div class="flex-grow-1">
              <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                <div>
                  <span class="fw-semibold">${v.nombre_original || v.nombre_archivo}</span>
                  ${v.es_vigente ? '<span class="badge bg-success ms-2">Vigente</span>' : ''}
                  <span class="ms-2">${estadoDocBadge(v.estado)}</span>
                </div>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-secondary" onclick="DocumentosView._descargar('${v.id}','${v.nombre_original}')" title="Descargar">
                    <i class="bi bi-download"></i>
                  </button>
                  ${puedeRevisar && (v.estado === 'PENDIENTE' || v.estado === 'REVISION_REQUERIDA') ? `
                  <button class="btn btn-sm btn-warning"
                          onclick="DocumentosView._revisarDesdeModal('${v.id}','${v.nombre_original}')">
                    <i class="bi bi-clipboard2-check me-1"></i>Revisar
                  </button>` : ''}
                </div>
              </div>
              <div class="text-muted small mt-1">
                <i class="bi bi-person me-1"></i>${v.subido_por_nombre}
                &nbsp;·&nbsp;
                <i class="bi bi-calendar me-1"></i>${UI.fechaHora(v.fecha_creacion)}
                ${v.revisado_por_nombre ? `&nbsp;·&nbsp;<i class="bi bi-person-check me-1"></i>Revisado por ${v.revisado_por_nombre}` : ''}
              </div>
              ${v.estado === 'REVISION_REQUERIDA' && v.comentario_revision ? `
              <div class="alert alert-warning py-1 px-2 mt-2 mb-0 small">
                <i class="bi bi-chat-left-text me-1"></i><strong>Observación:</strong> ${v.comentario_revision}
              </div>` : ''}
              ${v.estado === 'APROBADO' ? `
              <div class="text-success small mt-1">
                <i class="bi bi-check-circle-fill me-1"></i>Aprobado${v.fecha_revision ? ' el ' + UI.fecha(v.fecha_revision) : ''}
              </div>` : ''}
            </div>
          </div>`).join('')}
        </div>`;
    } catch(e) {
      body.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
  };

  /* ─── Tab: Otros documentos (no-PROGRAMA) ────────────────── */
  const renderTabOtros = async () => {
    const cont = document.getElementById('docs-tab-content');
    cont.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;
    try {
      const docs = await Api.getDocumentos();
      _otros = docs.filter(d => d.tipo !== 'PROGRAMA');
      _sortOtros = 'fecha'; _sortDirOtros = -1;

      cont.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header bg-white border-bottom py-2 px-3">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <div class="input-group input-group-sm" style="max-width:320px">
                <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
                <input type="text" id="busq-otros" class="form-control"
                       placeholder="Buscar por archivo, materia, curso…">
              </div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0" id="tabla-otros">
              <thead><tr>
                <th class="sortable-th" data-sort-otros="nombre" style="cursor:pointer">
                  Archivo <i class="bi bi-arrow-down-up text-muted" id="si-otros-nombre"></i></th>
                <th>Tipo</th>
                <th class="sortable-th" data-sort-otros="materia" style="cursor:pointer">
                  Materia <i class="bi bi-arrow-down-up text-muted" id="si-otros-materia"></i></th>
                <th class="sortable-th" data-sort-otros="curso" style="cursor:pointer">
                  Curso <i class="bi bi-arrow-down-up text-muted" id="si-otros-curso"></i></th>
                <th class="sortable-th" data-sort-otros="subido" style="cursor:pointer">
                  Subido por <i class="bi bi-arrow-down-up text-muted" id="si-otros-subido"></i></th>
                <th class="sortable-th" data-sort-otros="estado" style="cursor:pointer">
                  Estado <i class="bi bi-arrow-down-up text-muted" id="si-otros-estado"></i></th>
                <th class="sortable-th" data-sort-otros="fecha" style="cursor:pointer">
                  Fecha <i class="bi bi-arrow-down-up text-muted" id="si-otros-fecha"></i></th>
                <th></th>
              </tr></thead>
              <tbody id="tbody-otros"></tbody>
            </table>
          </div>
          <div class="card-footer text-muted small py-2" id="footer-otros"></div>
        </div>`;

      aplicarFiltroOtros();

      document.getElementById('busq-otros').addEventListener('input', aplicarFiltroOtros);

      document.querySelectorAll('[data-sort-otros]').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sortOtros;
          if (_sortOtros === col) _sortDirOtros *= -1;
          else { _sortOtros = col; _sortDirOtros = 1; }
          aplicarFiltroOtros();
        });
      });
    } catch(e) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const aplicarFiltroOtros = () => {
    const user = App.getUser();
    const q = (document.getElementById('busq-otros')?.value || '').toLowerCase();
    let lista = _otros.filter(d => {
      if (!q) return true;
      return (d.nombre_original || d.nombre_archivo || '').toLowerCase().includes(q)
          || (d.materia_nombre || '').toLowerCase().includes(q)
          || (d.curso_nombre  || '').toLowerCase().includes(q)
          || (d.subido_por_nombre || '').toLowerCase().includes(q)
          || (d.tipo || '').toLowerCase().includes(q);
    });

    lista.sort((a, b) => {
      let va, vb;
      switch (_sortOtros) {
        case 'nombre':  va = (a.nombre_original||a.nombre_archivo||'').toLowerCase(); vb = (b.nombre_original||b.nombre_archivo||'').toLowerCase(); break;
        case 'materia': va = (a.materia_nombre||'').toLowerCase(); vb = (b.materia_nombre||'').toLowerCase(); break;
        case 'curso':   va = (a.curso_nombre||'').toLowerCase();   vb = (b.curso_nombre||'').toLowerCase();   break;
        case 'subido':  va = (a.subido_por_nombre||'').toLowerCase(); vb = (b.subido_por_nombre||'').toLowerCase(); break;
        case 'estado':  va = (a.estado||'').toLowerCase(); vb = (b.estado||'').toLowerCase(); break;
        default:        va = a.fecha_creacion||''; vb = b.fecha_creacion||'';
      }
      return va < vb ? -_sortDirOtros : va > vb ? _sortDirOtros : 0;
    });

    // Actualizar íconos de sort
    ['nombre','materia','curso','subido','estado','fecha'].forEach(col => {
      const el = document.getElementById(`si-otros-${col}`);
      if (el) el.className = `bi ${sortIconD(col, _sortOtros, _sortDirOtros)}`;
    });

    const tbody = document.getElementById('tbody-otros');
    if (!tbody) return;

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
        <i class="bi bi-search me-2"></i>Sin resultados para la búsqueda
      </td></tr>`;
      const footer = document.getElementById('footer-otros');
      if (footer) footer.textContent = '0 documentos';
      return;
    }

    tbody.innerHTML = lista.map(d => `<tr>
      <td>
        <i class="bi ${iconoTipo(d.nombre_original)} me-2 text-primary"></i>
        <span class="fw-semibold">${d.nombre_original || d.nombre_archivo}</span>
      </td>
      <td><span class="badge bg-info text-dark">${d.tipo}</span></td>
      <td>${d.materia_nombre}</td>
      <td><span class="badge bg-light text-dark border">${d.curso_nombre || '—'}</span></td>
      <td class="text-muted small">${d.subido_por_nombre}</td>
      <td>${estadoDocBadge(d.estado)}</td>
      <td class="text-muted small">${UI.fecha(d.fecha_creacion)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary"
                  data-dl-id="${d.id}" data-dl-nombre="${d.nombre_original}"
                  title="Descargar"><i class="bi bi-download"></i></button>
          ${d.estado !== 'APROBADO' && (user.rol !== 'DOCENTE' || d.cargado_por === (App.getUser()?.id)) ? `
          <button class="btn btn-outline-danger"
                  data-del-doc="${d.id}" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`).join('');

    const footer = document.getElementById('footer-otros');
    if (footer) {
      const total = _otros.length;
      footer.textContent = lista.length === total
        ? `${total} documento${total !== 1 ? 's' : ''}`
        : `${lista.length} de ${total} documentos`;
    }

    // Re-bind action buttons
    const cont = document.getElementById('docs-tab-content');
    cont.querySelectorAll('[data-dl-id]').forEach(btn => {
      btn.addEventListener('click', () => _descargar(btn.dataset.dlId, btn.dataset.dlNombre));
    });
    cont.querySelectorAll('[data-del-doc]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!UI.confirm('¿Eliminar este documento?')) return;
        try {
          await Api.eliminarDocumento(btn.dataset.delDoc);
          UI.toast('Documento eliminado', 'success');
          renderTabOtros();
        } catch(e) { UI.toast(e.message, 'error'); }
      });
    });
  };

  /* ─── Tab: Pendientes de revisión ────────────────────────── */
  const renderTabPendientes = async () => {
    const cont = document.getElementById('docs-tab-content');
    cont.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;
    try {
      const docs = await Api.getDocumentos();
      _pendientes = docs.filter(d => d.estado === 'PENDIENTE' || d.estado === 'REVISION_REQUERIDA');
      _sortPend = 'fecha'; _sortDirPend = -1;

      if (!_pendientes.length) {
        UI.empty('docs-tab-content', 'No hay documentos pendientes de revisión', 'clipboard2-check');
        return;
      }

      cont.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header bg-warning bg-opacity-10 py-2 px-3">
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <strong><i class="bi bi-hourglass-split me-2 text-warning"></i>Pendientes de revisión</strong>
              <div class="input-group input-group-sm ms-auto" style="max-width:300px">
                <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
                <input type="text" id="busq-pend-doc" class="form-control"
                       placeholder="Buscar por archivo, materia, docente…">
              </div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0" id="tabla-pend">
              <thead><tr>
                <th class="sortable-th" data-sort-pend="nombre" style="cursor:pointer">
                  Archivo <i class="bi bi-arrow-down-up text-muted" id="si-pend-nombre"></i></th>
                <th>Tipo</th>
                <th class="sortable-th" data-sort-pend="materia" style="cursor:pointer">
                  Materia · Curso <i class="bi bi-arrow-down-up text-muted" id="si-pend-materia"></i></th>
                <th class="sortable-th" data-sort-pend="docente" style="cursor:pointer">
                  Docente <i class="bi bi-arrow-down-up text-muted" id="si-pend-docente"></i></th>
                <th>Versión</th>
                <th class="sortable-th" data-sort-pend="estado" style="cursor:pointer">
                  Estado <i class="bi bi-arrow-down-up text-muted" id="si-pend-estado"></i></th>
                <th class="sortable-th" data-sort-pend="fecha" style="cursor:pointer">
                  Fecha <i class="bi bi-arrow-down-up text-muted" id="si-pend-fecha"></i></th>
                <th></th>
              </tr></thead>
              <tbody id="tbody-pend"></tbody>
            </table>
          </div>
          <div class="card-footer text-muted small py-2" id="footer-pend"></div>
        </div>`;

      aplicarFiltroPendientes();

      document.getElementById('busq-pend-doc').addEventListener('input', aplicarFiltroPendientes);

      document.querySelectorAll('[data-sort-pend]').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sortPend;
          if (_sortPend === col) _sortDirPend *= -1;
          else { _sortPend = col; _sortDirPend = 1; }
          aplicarFiltroPendientes();
        });
      });
    } catch(e) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const aplicarFiltroPendientes = () => {
    const q = (document.getElementById('busq-pend-doc')?.value || '').toLowerCase();
    let lista = _pendientes.filter(d => {
      if (!q) return true;
      return (d.nombre_original || d.nombre_archivo || '').toLowerCase().includes(q)
          || (d.materia_nombre || '').toLowerCase().includes(q)
          || (d.curso_nombre  || '').toLowerCase().includes(q)
          || (d.subido_por_nombre || '').toLowerCase().includes(q)
          || (d.tipo || '').toLowerCase().includes(q);
    });

    lista.sort((a, b) => {
      let va, vb;
      switch (_sortPend) {
        case 'nombre':  va = (a.nombre_original||a.nombre_archivo||'').toLowerCase(); vb = (b.nombre_original||b.nombre_archivo||'').toLowerCase(); break;
        case 'materia': va = (a.materia_nombre||'').toLowerCase(); vb = (b.materia_nombre||'').toLowerCase(); break;
        case 'docente': va = (a.subido_por_nombre||'').toLowerCase(); vb = (b.subido_por_nombre||'').toLowerCase(); break;
        case 'estado':  va = (a.estado||'').toLowerCase(); vb = (b.estado||'').toLowerCase(); break;
        default:        va = a.fecha_creacion||''; vb = b.fecha_creacion||'';
      }
      return va < vb ? -_sortDirPend : va > vb ? _sortDirPend : 0;
    });

    // Actualizar íconos de sort
    ['nombre','materia','docente','estado','fecha'].forEach(col => {
      const el = document.getElementById(`si-pend-${col}`);
      if (el) el.className = `bi ${sortIconD(col, _sortPend, _sortDirPend)}`;
    });

    const tbody = document.getElementById('tbody-pend');
    if (!tbody) return;

    tbody.innerHTML = lista.map(d => `<tr>
      <td><i class="bi ${iconoTipo(d.nombre_original)} me-2 text-primary"></i>
          <span class="fw-semibold">${d.nombre_original || d.nombre_archivo}</span></td>
      <td><span class="badge bg-info text-dark">${d.tipo}</span></td>
      <td><strong>${d.materia_nombre}</strong><br>
          <span class="badge bg-light text-dark border small">${d.curso_nombre || '—'}</span></td>
      <td class="text-muted small">${d.subido_por_nombre}</td>
      <td class="text-center"><span class="badge bg-secondary">v${d.version}</span></td>
      <td>${estadoDocBadge(d.estado)}</td>
      <td class="text-muted small">${UI.fecha(d.fecha_creacion)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary"
                  data-dl-id="${d.id}" data-dl-nombre="${d.nombre_original}"
                  title="Descargar"><i class="bi bi-download"></i></button>
          <button class="btn btn-warning"
                  data-revisar-doc="${d.id}"
                  data-doc-nombre="${d.nombre_original}">
            <i class="bi bi-clipboard2-check me-1"></i>Revisar
          </button>
        </div>
      </td>
    </tr>`).join('');

    const footer = document.getElementById('footer-pend');
    if (footer) {
      const total = _pendientes.length;
      footer.textContent = lista.length === total
        ? `${total} pendiente${total !== 1 ? 's' : ''}`
        : `${lista.length} de ${total} pendientes`;
    }

    // Re-bind action buttons
    const cont = document.getElementById('docs-tab-content');
    cont.querySelectorAll('[data-dl-id]').forEach(btn => {
      btn.addEventListener('click', () => _descargar(btn.dataset.dlId, btn.dataset.dlNombre));
    });
    cont.querySelectorAll('[data-revisar-doc]').forEach(btn => {
      btn.addEventListener('click', () => abrirModalRevisar(btn.dataset.revisarDoc, btn.dataset.docNombre));
    });
  };

  /* ─── Badge pendientes ───────────────────────────────────── */
  const actualizarBadgePendientes = async () => {
    try {
      const docs = await Api.getDocumentos();
      const n = docs.filter(d => d.estado === 'PENDIENTE' || d.estado === 'REVISION_REQUERIDA').length;
      const badge = document.getElementById('badge-docs-pendientes');
      if (!badge) return;
      if (n > 0) { badge.textContent = n; badge.style.display = ''; }
      else badge.style.display = 'none';
    } catch(e) {}
  };

  /* ─── Modal subir documento ──────────────────────────────── */
  const abrirModalSubir = async (materiaIdPreset = null, tipoPreset = null) => {
    UI.clearAlert('doc-alert');
    document.getElementById('doc-archivo').value = '';
    document.getElementById('doc-tipo').value = tipoPreset || 'OTRO';

    try {
      const materias = await Api.getMaterias();
      const sel = document.getElementById('doc-materia');
      sel.innerHTML = '<option value="">Seleccione materia…</option>' +
        materias.map(m =>
          `<option value="${m.id}" ${m.id === materiaIdPreset ? 'selected' : ''}>
            ${m.nombre} — ${m.curso_nombre || ''}
          </option>`
        ).join('');
    } catch(e) {}

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-documento'));
    modal.show();

    const btn = document.getElementById('btn-subir-doc');
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);

    document.getElementById('btn-subir-doc').addEventListener('click', async () => {
      const materia_id = UI.getVal('doc-materia');
      const archivo    = document.getElementById('doc-archivo').files[0];
      if (!materia_id) { UI.modalAlert('doc-alert', 'Seleccione una materia'); return; }
      if (!archivo)    { UI.modalAlert('doc-alert', 'Seleccione un archivo'); return; }

      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('materia_id', materia_id);
      formData.append('tipo', UI.getVal('doc-tipo'));

      const btnEl = document.getElementById('btn-subir-doc');
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Subiendo...';
      try {
        await Api.subirDocumento(formData);
        UI.toast('Documento cargado correctamente ✓', 'success');
        modal.hide();
        renderTabProgramas();
      } catch(err) {
        UI.modalAlert('doc-alert', err.message);
      } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="bi bi-upload me-1"></i>Subir';
      }
    });
  };

  /* ─── Modal revisar documento ────────────────────────────── */
  const abrirModalRevisar = (docId, docNombre) => {
    document.getElementById('rev-doc-nombre').textContent = docNombre || docId;
    document.getElementById('rev-estado').value = 'APROBADO';
    document.getElementById('rev-comentario').value = '';
    document.getElementById('rev-comentario-group').style.display = 'none';
    UI.clearAlert('rev-alert');

    // Mostrar/ocultar campo comentario según estado
    const estadoSel = document.getElementById('rev-estado');
    const comentGrp = document.getElementById('rev-comentario-group');
    const onChangeEstado = () => {
      comentGrp.style.display = estadoSel.value === 'REVISION_REQUERIDA' ? 'block' : 'none';
    };
    estadoSel.removeEventListener('change', onChangeEstado);
    estadoSel.addEventListener('change', onChangeEstado);

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-revision'));
    modal.show();

    const btn = document.getElementById('btn-confirmar-revision');
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);

    document.getElementById('btn-confirmar-revision').addEventListener('click', async () => {
      const estado     = UI.getVal('rev-estado');
      const comentario = document.getElementById('rev-comentario').value.trim();

      if (estado === 'REVISION_REQUERIDA' && !comentario) {
        UI.modalAlert('rev-alert', 'Ingrese una observación para el docente', 'warning');
        return;
      }

      const btnEl = document.getElementById('btn-confirmar-revision');
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
      try {
        await Api.revisarDocumento(docId, { estado, comentario });
        UI.toast(
          estado === 'APROBADO' ? 'Documento aprobado ✓' : 'Revisión solicitada al docente',
          estado === 'APROBADO' ? 'success' : 'warning'
        );
        modal.hide();
        render();
      } catch(err) {
        UI.modalAlert('rev-alert', err.message);
      } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar';
      }
    });
  };

  /* ─── Helpers ────────────────────────────────────────────── */
  const _descargar = async (id, nombre) => {
    try { await Api.descargarDocumento(id, nombre); }
    catch(e) { UI.toast('Error al descargar: ' + e.message, 'error'); }
  };

  const _revisarDesdeModal = (id, nombre) => {
    // Cerrar modal versiones y abrir modal revisión
    const mv = bootstrap.Modal.getInstance(document.getElementById('modal-versiones'));
    if (mv) mv.hide();
    setTimeout(() => abrirModalRevisar(id, nombre), 350);
  };

  const estadoDocBadge = (estado) => {
    const map = {
      'PENDIENTE':           '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Pendiente</span>',
      'APROBADO':            '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Aprobado</span>',
      'REVISION_REQUERIDA':  '<span class="badge bg-danger"><i class="bi bi-exclamation-circle me-1"></i>Revisión requerida</span>',
      'INMUTABLE':           '<span class="badge bg-dark"><i class="bi bi-lock me-1"></i>Inmutable</span>',
    };
    return map[estado] || `<span class="badge bg-secondary">${estado || '—'}</span>`;
  };

  const estadoDocColor = (estado) => {
    const map = {
      'PENDIENTE':          '#F59E0B',
      'APROBADO':           '#10B981',
      'REVISION_REQUERIDA': '#EF4444',
      'INMUTABLE':          '#374151',
    };
    return map[estado] || '#6B7280';
  };

  const iconoTipo = (nombre) => {
    if (!nombre) return 'bi-file-earmark';
    const ext = nombre.split('.').pop().toLowerCase();
    const map = {
      pdf: 'bi-file-earmark-pdf text-danger',
      doc: 'bi-file-earmark-word text-primary', docx: 'bi-file-earmark-word text-primary',
      xls: 'bi-file-earmark-excel text-success', xlsx: 'bi-file-earmark-excel text-success',
      ppt: 'bi-file-earmark-ppt text-warning',   pptx: 'bi-file-earmark-ppt text-warning',
      jpg: 'bi-file-earmark-image text-info',    png: 'bi-file-earmark-image text-info',
      txt: 'bi-file-earmark-text'
    };
    return map[ext] || 'bi-file-earmark';
  };

  // Exponer helpers necesarios para eventos inline
  return { render, _descargar, _revisarDesdeModal };
})();
