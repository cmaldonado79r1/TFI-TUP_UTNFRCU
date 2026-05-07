/* ── Vista Clases ────────────────────────────────────────── */
const ClasesView = (() => {
  let _materias = [];
  let _filtros = {};

  const render = async () => {
    const user = App.getUser();
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-journal-text me-2"></i>Registro de Clases</h4>
        ${user.rol === 'DOCENTE' ? `<button class="btn btn-primary" id="btn-nueva-clase"><i class="bi bi-plus-lg me-1"></i>Nueva clase</button>` : ''}
      </div>
      <!-- Filtros -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-3"><label class="form-label small mb-1">Materia</label>
              <select id="filtro-materia" class="form-select form-select-sm"></select></div>
            <div class="col-sm-2"><label class="form-label small mb-1">Estado</label>
              <select id="filtro-estado" class="form-select form-select-sm">
                <option value="">Todos</option>
                <option value="CREADO">Creado</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="REVISION_REQUERIDA">Revisión requerida</option>
                <option value="APROBADO">Aprobado</option>
                <option value="INMUTABLE">Inmutable</option>
              </select></div>
            <div class="col-sm-2"><label class="form-label small mb-1">Desde</label>
              <input type="date" id="filtro-desde" class="form-control form-control-sm"/></div>
            <div class="col-sm-2"><label class="form-label small mb-1">Hasta</label>
              <input type="date" id="filtro-hasta" class="form-control form-control-sm"/></div>
            <div class="col-sm-3 d-flex gap-1">
              <button class="btn btn-primary btn-sm flex-fill" id="btn-filtrar"><i class="bi bi-search me-1"></i>Filtrar</button>
              <button class="btn btn-outline-secondary btn-sm" id="btn-limpiar-filtros" title="Limpiar"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
        </div>
      </div>
      <div id="clases-container"></div>
    </div>`;

    // Cargar materias para filtro
    try {
      _materias = await Api.getMaterias();
      UI.fillSelect('filtro-materia', _materias, 'id', 'materia_nombre', 'Todas las materias');
    } catch(e) {}

    document.getElementById('btn-filtrar')?.addEventListener('click', () => {
      _filtros = {
        materia_id: UI.getVal('filtro-materia'),
        estado:     UI.getVal('filtro-estado'),
        fecha_desde:UI.getVal('filtro-desde'),
        fecha_hasta:UI.getVal('filtro-hasta'),
      };
      cargarClases();
    });

    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
      ['filtro-materia','filtro-estado','filtro-desde','filtro-hasta'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      _filtros = {};
      cargarClases();
    });

    document.getElementById('btn-nueva-clase')?.addEventListener('click', () => abrirFormClase());

    cargarClases();
  };

  const cargarClases = async () => {
    UI.loader('clases-container');
    try {
      const clases = await Api.getClases(_filtros);
      if (!clases.length) { UI.empty('clases-container', 'No se encontraron clases', 'journal-x'); return; }
      document.getElementById('clases-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>N°</th><th>Fecha</th><th>Materia</th><th>Curso</th>
                ${App.getUser().rol !== 'DOCENTE' ? '<th>Docente</th>' : ''}
                <th>Carácter</th><th>Estado</th><th>Temas</th><th>Acciones</th>
              </tr></thead>
              <tbody>${clases.map(c => renderFila(c)).join('')}</tbody>
            </table>
          </div>
        </div>`;
      // Eventos
      document.querySelectorAll('[data-ver-clase]').forEach(btn => {
        btn.addEventListener('click', () => verClase(btn.dataset.verClase));
      });
      document.querySelectorAll('[data-editar-clase]').forEach(btn => {
        btn.addEventListener('click', () => abrirFormClase(btn.dataset.editarClase));
      });
    } catch(e) {
      document.getElementById('clases-container').innerHTML =
        `<div class="alert alert-danger">Error al cargar clases: ${e.message}</div>`;
    }
  };

  const renderFila = (c) => {
    const user = App.getUser();
    const puedeEditar = user.rol === 'DOCENTE' && c.estado === 'REVISION_REQUERIDA';
    return `<tr>
      <td><span class="badge bg-secondary">${c.numero_clase || '—'}</span></td>
      <td>${UI.fecha(c.fecha)}</td>
      <td><strong>${c.materia_nombre}</strong><br/><small class="text-muted">${c.materia_codigo || ''}</small></td>
      <td>${c.curso_nombre}<br/><small class="text-muted">${c.curso_turno || ''}</small></td>
      ${user.rol !== 'DOCENTE' ? `<td>${c.docente_nombre}</td>` : ''}
      <td>${c.caracter}</td>
      <td>${UI.estadoBadge(c.estado)}</td>
      <td><span class="badge bg-light text-dark border">${c.total_temas}</span></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" data-ver-clase="${c.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
          ${puedeEditar ? `<button class="btn btn-outline-warning" data-editar-clase="${c.id}" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  };

  const verClase = async (id) => {
    const body = document.getElementById('modal-detalle-body');
    const footer = document.getElementById('modal-detalle-footer');
    body.innerHTML = `<div class="sgca-loader"><div class="spinner-border"></div></div>`;
    footer.innerHTML = '';
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-detalle-clase'));
    modal.show();
    try {
      const c = await Api.getClase(id);
      body.innerHTML = renderDetalle(c);
      footer.innerHTML = renderFooterDetalle(c);
      // Botón imprevisto
      document.getElementById('btn-agregar-imprevisto')?.addEventListener('click', () => {
        modal.hide();
        abrirModalImprevisto(id);
      });
      // Botón editar
      document.getElementById('btn-editar-desde-detalle')?.addEventListener('click', () => {
        modal.hide();
        abrirFormClase(id);
      });
    } catch(e) {
      body.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const renderDetalle = (c) => `
    <div class="row g-3">
      <div class="col-md-6">
        <table class="table table-sm table-bordered mb-0">
          <tr><th class="bg-light w-40">Materia</th><td>${c.materia_nombre}</td></tr>
          <tr><th class="bg-light">Curso</th><td>${c.curso_nombre} – ${c.turno || ''}</td></tr>
          <tr><th class="bg-light">Docente</th><td>${c.docente_nombre}</td></tr>
          <tr><th class="bg-light">Fecha</th><td>${UI.fecha(c.fecha)}</td></tr>
          <tr><th class="bg-light">N° Clase</th><td>${c.numero_clase || '—'}</td></tr>
          <tr><th class="bg-light">Carácter</th><td>${c.caracter}</td></tr>
          <tr><th class="bg-light">Estado</th><td>${UI.estadoBadge(c.estado)}</td></tr>
          ${c.aprobador_nombre ? `<tr><th class="bg-light">Revisado por</th><td>${c.aprobador_nombre}</td></tr>` : ''}
        </table>
        ${c.observaciones ? `<div class="alert alert-light border mt-2 small"><strong>Observaciones:</strong> ${c.observaciones}</div>` : ''}
      </div>
      <div class="col-md-6">
        ${c.aprobaciones?.length ? `
          <h6 class="fw-bold">Historial de revisiones</h6>
          <div class="timeline mb-3">
            ${c.aprobaciones.map(a => `
              <div class="timeline-item">
                <div class="small"><strong>${a.estado === 'APROBADO' ? '✅ Aprobado' : '❌ Rechazado'}</strong> por ${a.aprobador_nombre}</div>
                <div class="text-muted" style="font-size:.75rem">${UI.fechaHora(a.fecha_revision)}</div>
                ${a.comentarios ? `<div class="small text-muted fst-italic">"${a.comentarios}"</div>` : ''}
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>
    <hr/>
    <h6 class="fw-bold"><i class="bi bi-book me-2"></i>Temas (${c.temas?.length || 0})</h6>
    ${c.temas?.length ? `<ol class="list-group list-group-flush list-group-numbered mb-3">
      ${c.temas.map(t => `<li class="list-group-item"><strong>${t.nombre}</strong>${t.descripcion ? `<br/><small class="text-muted">${t.descripcion}</small>` : ''}</li>`).join('')}
    </ol>` : '<p class="text-muted small">Sin temas registrados</p>'}
    <h6 class="fw-bold"><i class="bi bi-list-task me-2"></i>Actividades (${c.actividades?.length || 0})</h6>
    ${c.actividades?.length ? `<ul class="list-group list-group-flush mb-3">
      ${c.actividades.map(a => `<li class="list-group-item"><span class="badge bg-secondary me-2">${a.tipo}</span><strong>${a.nombre}</strong>${a.descripcion ? `<br/><small class="text-muted">${a.descripcion}</small>` : ''}</li>`).join('')}
    </ul>` : '<p class="text-muted small">Sin actividades registradas</p>'}
    ${c.imprevistos?.length ? `
      <h6 class="fw-bold text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Imprevistos (${c.imprevistos.length})</h6>
      <ul class="list-group list-group-flush">
        ${c.imprevistos.map(i => `<li class="list-group-item">
          <span class="me-1">${UI.sevIcon(i.severidad)}</span>
          <strong>[${UI.tipoLabel(i.tipo)}]</strong> ${i.descripcion}
          ${i.resuelto ? '<span class="badge bg-success ms-2">Resuelto</span>' : '<span class="badge bg-warning text-dark ms-2">Pendiente</span>'}
        </li>`).join('')}
      </ul>` : ''}`;

  const renderFooterDetalle = (c) => {
    const user = App.getUser();
    let btns = `<button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>`;
    if (user.rol === 'DOCENTE' && c.estado !== 'INMUTABLE' && c.estado !== 'APROBADO') {
      btns += `<button class="btn btn-warning" id="btn-agregar-imprevisto"><i class="bi bi-exclamation-triangle me-1"></i>Imprevisto</button>`;
      if (c.estado === 'REVISION_REQUERIDA') {
        btns += `<button class="btn btn-primary" id="btn-editar-desde-detalle"><i class="bi bi-pencil me-1"></i>Editar y reenviar</button>`;
      }
    }
    return btns;
  };

  const abrirFormClase = async (claseId = null) => {
    const modalEl = document.getElementById('modal-clase');
    document.getElementById('modal-clase-title').textContent = claseId ? 'Editar Clase' : 'Nueva Clase';
    const body = document.getElementById('modal-clase-body');
    body.innerHTML = `<div class="sgca-loader"><div class="spinner-border"></div></div>`;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    try {
      const materias = await Api.getMaterias();
      let claseData = null;
      if (claseId) claseData = await Api.getClase(claseId);

      body.innerHTML = renderFormClase(materias, claseData);
      inicializarFormClase(claseData, modal);

      // Validación de fecha en tiempo real
      document.getElementById('clase-fecha')?.addEventListener('change', async () => {
        const materia_id = UI.getVal('clase-materia');
        const fecha = UI.getVal('clase-fecha');
        if (!materia_id || !fecha) return;
        try {
          const v = await Api.validarFecha({ fecha, materia_id });
          const alertEl = document.getElementById('alerta-fecha');
          if (!v.disponible) {
            alertEl.className = 'alert alert-warning';
            alertEl.textContent = v.alerta || 'La fecha no está disponible';
            alertEl.classList.remove('d-none');
          } else {
            alertEl.classList.add('d-none');
          }
        } catch(e) {}
      });
    } catch(e) {
      body.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const renderFormClase = (materias, claseData) => {
    const temas = claseData?.temas || [{ nombre: '', descripcion: '' }];
    const actividades = claseData?.actividades || [];
    return `
      <form id="form-clase">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Materia *</label>
            <select id="clase-materia" class="form-select" ${claseData ? 'disabled' : ''} required>
              <option value="">Seleccione materia...</option>
              ${materias.map(m => `<option value="${m.id}" ${claseData?.materia_id===m.id?'selected':''}>${m.materia_nombre} – ${m.curso_nombre}</option>`).join('')}
            </select>
            ${claseData ? `<input type="hidden" id="clase-materia-hidden" value="${claseData.materia_id}"/>` : ''}
          </div>
          <div class="col-md-3">
            <label class="form-label fw-semibold">Fecha *</label>
            <input type="date" id="clase-fecha" class="form-control" value="${claseData?.fecha ? claseData.fecha.substring(0,10) : ''}" ${claseData ? 'readonly' : ''} required/>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-semibold">Carácter</label>
            <select id="clase-caracter" class="form-select">
              <option value="TEÓRICA" ${claseData?.caracter==='TEÓRICA'?'selected':''}>Teórica</option>
              <option value="PRÁCTICA" ${claseData?.caracter==='PRÁCTICA'?'selected':''}>Práctica</option>
              <option value="TEÓRICO-PRÁCTICA" ${claseData?.caracter==='TEÓRICO-PRÁCTICA'?'selected':''}>Teórico-práctica</option>
              <option value="EVALUACIÓN" ${claseData?.caracter==='EVALUACIÓN'?'selected':''}>Evaluación</option>
              <option value="REPASO" ${claseData?.caracter==='REPASO'?'selected':''}>Repaso</option>
            </select>
          </div>
        </div>
        <div id="alerta-fecha" class="alert d-none mb-2"></div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Observaciones <span class="text-muted">(opcional)</span></label>
          <textarea id="clase-observaciones" class="form-control" rows="2" placeholder="Observaciones generales de la clase...">${claseData?.observaciones || ''}</textarea>
        </div>
        <!-- TEMAS -->
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="mb-0 fw-bold"><i class="bi bi-book me-2 text-primary"></i>Temas *</h6>
          <button type="button" class="btn btn-outline-primary btn-sm" id="btn-add-tema"><i class="bi bi-plus-lg me-1"></i>Agregar tema</button>
        </div>
        <div id="temas-container">
          ${temas.map((t, i) => renderTemaRow(t, i)).join('')}
        </div>
        <!-- ACTIVIDADES -->
        <div class="d-flex align-items-center justify-content-between mb-2 mt-3">
          <h6 class="mb-0 fw-bold"><i class="bi bi-list-task me-2 text-success"></i>Actividades <span class="text-muted fw-normal">(opcional)</span></h6>
          <button type="button" class="btn btn-outline-success btn-sm" id="btn-add-actividad"><i class="bi bi-plus-lg me-1"></i>Agregar actividad</button>
        </div>
        <div id="actividades-container">
          ${actividades.map((a, i) => renderActividadRow(a, i)).join('')}
        </div>
        <div id="form-clase-alert" class="alert d-none mt-3"></div>
        <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-clase">
            <span id="clase-spinner" class="spinner-border spinner-border-sm d-none me-1"></span>
            <i class="bi bi-send me-1"></i>${claseData ? 'Guardar y reenviar' : 'Registrar clase'}
          </button>
        </div>
      </form>`;
  };

  const renderTemaRow = (t = {}, i = 0) => `
    <div class="tema-row" data-tema="${i}">
      <button type="button" class="btn btn-danger btn-remove-row btn-remove-tema" title="Eliminar"><i class="bi bi-x"></i></button>
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small fw-semibold mb-1">Nombre del tema *</label>
          <input type="text" class="form-control form-control-sm tema-nombre" value="${t.nombre || ''}" placeholder="Ej: Introducción a la función lineal" required/>
        </div>
        <div class="col-md-8">
          <label class="form-label small fw-semibold mb-1">Descripción</label>
          <input type="text" class="form-control form-control-sm tema-descripcion" value="${t.descripcion || ''}" placeholder="Descripción breve del tema..."/>
        </div>
      </div>
    </div>`;

  const renderActividadRow = (a = {}, i = 0) => `
    <div class="actividad-row" data-act="${i}">
      <button type="button" class="btn btn-danger btn-remove-row btn-remove-actividad" title="Eliminar"><i class="bi bi-x"></i></button>
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label small fw-semibold mb-1">Tipo</label>
          <select class="form-select form-select-sm act-tipo">
            <option value="PRÁCTICA" ${a.tipo==='PRÁCTICA'?'selected':''}>Práctica</option>
            <option value="TAREA" ${a.tipo==='TAREA'?'selected':''}>Tarea</option>
            <option value="LABORATORIO" ${a.tipo==='LABORATORIO'?'selected':''}>Laboratorio</option>
            <option value="PROYECTO" ${a.tipo==='PROYECTO'?'selected':''}>Proyecto</option>
            <option value="EXPOSICION" ${a.tipo==='EXPOSICION'?'selected':''}>Exposición</option>
            <option value="OTRO" ${a.tipo==='OTRO'?'selected':''}>Otro</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-semibold mb-1">Nombre *</label>
          <input type="text" class="form-control form-control-sm act-nombre" value="${a.nombre || ''}" placeholder="Nombre de la actividad..." required/>
        </div>
        <div class="col-md-5">
          <label class="form-label small fw-semibold mb-1">Descripción</label>
          <input type="text" class="form-control form-control-sm act-descripcion" value="${a.descripcion || ''}" placeholder="Descripción breve..."/>
        </div>
      </div>
    </div>`;

  const inicializarFormClase = (claseData, modal) => {
    let temaCount = (claseData?.temas?.length || 1);
    let actCount  = (claseData?.actividades?.length || 0);

    document.getElementById('btn-add-tema')?.addEventListener('click', () => {
      document.getElementById('temas-container').insertAdjacentHTML('beforeend', renderTemaRow({}, temaCount++));
      bindRemoveBtns();
    });

    document.getElementById('btn-add-actividad')?.addEventListener('click', () => {
      document.getElementById('actividades-container').insertAdjacentHTML('beforeend', renderActividadRow({}, actCount++));
      bindRemoveBtns();
    });

    bindRemoveBtns();

    document.getElementById('form-clase')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const spinner = document.getElementById('clase-spinner');
      const alertEl = document.getElementById('form-clase-alert');
      spinner.classList.remove('d-none');

      const materia_id = claseData
        ? document.getElementById('clase-materia-hidden')?.value || UI.getVal('clase-materia')
        : UI.getVal('clase-materia');

      const temas = [...document.querySelectorAll('#temas-container .tema-row')].map(row => ({
        nombre:      row.querySelector('.tema-nombre').value.trim(),
        descripcion: row.querySelector('.tema-descripcion').value.trim(),
      })).filter(t => t.nombre);

      const actividades = [...document.querySelectorAll('#actividades-container .actividad-row')].map(row => ({
        nombre:      row.querySelector('.act-nombre').value.trim(),
        tipo:        row.querySelector('.act-tipo').value,
        descripcion: row.querySelector('.act-descripcion').value.trim(),
      })).filter(a => a.nombre);

      if (!materia_id) { UI.modalAlert('form-clase-alert', 'Seleccione una materia'); spinner.classList.add('d-none'); return; }
      if (!temas.length) { UI.modalAlert('form-clase-alert', 'Debe agregar al menos un tema'); spinner.classList.add('d-none'); return; }

      const payload = {
        materia_id,
        fecha:        UI.getVal('clase-fecha'),
        caracter:     UI.getVal('clase-caracter'),
        observaciones:UI.getVal('clase-observaciones'),
        temas,
        actividades,
      };

      try {
        if (claseData) {
          await Api.editarClase(claseData.id, payload);
          UI.toast('Clase actualizada y reenviada para revisión ✓', 'success');
        } else {
          await Api.crearClase(payload);
          UI.toast('Clase registrada y enviada para revisión ✓', 'success');
        }
        modal.hide();
        cargarClases();
      } catch(err) {
        UI.modalAlert('form-clase-alert', err.message);
      } finally {
        spinner.classList.add('d-none');
      }
    });
  };

  const bindRemoveBtns = () => {
    document.querySelectorAll('.btn-remove-tema').forEach(btn => {
      btn.onclick = () => {
        const rows = document.querySelectorAll('#temas-container .tema-row');
        if (rows.length <= 1) { UI.toast('Debe haber al menos un tema', 'warning'); return; }
        btn.closest('.tema-row').remove();
      };
    });
    document.querySelectorAll('.btn-remove-actividad').forEach(btn => {
      btn.onclick = () => btn.closest('.actividad-row').remove();
    });
  };

  const abrirModalImprevisto = (claseId) => {
    document.getElementById('imprevisto-clase-id').value = claseId;
    document.getElementById('imprevisto-descripcion').value = '';
    document.getElementById('imprevisto-tipo').value = 'OTRO';
    document.getElementById('imprevisto-severidad').value = 'BAJA';
    UI.clearAlert('imprevisto-alert');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-imprevisto'));
    modal.show();

    document.getElementById('btn-guardar-imprevisto').onclick = async () => {
      const desc = UI.getVal('imprevisto-descripcion');
      if (!desc) { UI.modalAlert('imprevisto-alert', 'La descripción es requerida'); return; }
      try {
        await Api.crearImprevisto({
          clase_id:    claseId,
          descripcion: desc,
          tipo:        UI.getVal('imprevisto-tipo'),
          severidad:   UI.getVal('imprevisto-severidad'),
        });
        UI.toast('Imprevisto registrado correctamente', 'success');
        modal.hide();
        cargarClases();
      } catch(err) {
        UI.modalAlert('imprevisto-alert', err.message);
      }
    };
  };

  return { render, verClase };
})();
