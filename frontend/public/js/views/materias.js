/* ── Vista Materias ───────────────────────────────────────── */
const MateriasView = (() => {
  let _cursos   = [];
  let _docentes = [];
  let _todos    = [];   // caché para búsqueda/ordenamiento
  let _sortBy   = 'nombre';
  let _sortDir  = 1;

  const sortIcon = (col) => _sortBy !== col ? 'bi-arrow-down-up text-muted' :
    (_sortDir === 1 ? 'bi-arrow-up' : 'bi-arrow-down');

  const titleCase = (s) => s
    ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    : s;

  /* ── render principal ───────────────────────────────────── */
  const render = async () => {
    const user = App.getUser();
    const mc   = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-book-half me-2"></i>Materias</h4>
        ${['DIRECTIVO','ADMINISTRADOR'].includes(user.rol)
          ? `<button class="btn btn-success" id="btn-nueva-materia"><i class="bi bi-plus-lg me-1"></i>Nueva materia</button>`
          : ''}
      </div>
      <!-- Filtros -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-4">
              <label class="form-label small mb-1">Buscar</label>
              <div class="input-group input-group-sm">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="busq-mat" class="form-control"
                       placeholder="Nombre de materia...">
              </div>
            </div>
            <div class="col-sm-4">
              <label class="form-label small mb-1">Curso</label>
              <select id="filtro-mat-curso" class="form-select form-select-sm">
                <option value="">Todos los cursos</option>
              </select>
            </div>
            <div class="col-sm-2">
              <label class="form-label small mb-1">Estado</label>
              <select id="filtro-mat-estado" class="form-select form-select-sm">
                <option value="">Todos</option>
                <option value="1">Activas</option>
                <option value="0">Inactivas</option>
              </select>
            </div>
            <div class="col-sm-2 d-flex gap-1 align-items-end">
              <button class="btn btn-outline-secondary btn-sm w-100" id="btn-limpiar-mat">
                <i class="bi bi-x-lg me-1"></i>Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="materias-container"></div>
    </div>`;

    try {
      _cursos = await Api.getCursos();
      // Solo cursos activos en el select del filtro
      const cursosActivos = _cursos.filter(c => c.activo);
      document.getElementById('filtro-mat-curso').innerHTML =
        '<option value="">Todos los cursos</option>' +
        cursosActivos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    } catch(e) {}

    if (['DIRECTIVO','ADMINISTRADOR'].includes(user.rol)) {
      try { _docentes = await Api.getUsuarios({ rol: 'DOCENTE', estado: 'true' }); } catch(e) {}
      document.getElementById('btn-nueva-materia')
        .addEventListener('click', () => abrirModalMateria());
    }

    document.getElementById('busq-mat').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-mat-curso').addEventListener('change', cargarMaterias);
    document.getElementById('filtro-mat-estado').addEventListener('change', aplicarFiltros);
    document.getElementById('btn-limpiar-mat').addEventListener('click', () => {
      document.getElementById('busq-mat').value = '';
      document.getElementById('filtro-mat-curso').value = '';
      document.getElementById('filtro-mat-estado').value = '';
      cargarMaterias();
    });

    cargarMaterias();
  };

  /* ── carga desde API ────────────────────────────────────── */
  const cargarMaterias = async () => {
    UI.loader('materias-container');
    try {
      const params = { curso_id: UI.getVal('filtro-mat-curso') };
      _todos = await Api.getMaterias(params);
      aplicarFiltros();
    } catch(e) {
      document.getElementById('materias-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  /* ── filtrado + ordenamiento en cliente ─────────────────── */
  const aplicarFiltros = () => {
    const busq   = (document.getElementById('busq-mat')?.value || '').toLowerCase();
    const estado = document.getElementById('filtro-mat-estado')?.value;

    let lista = _todos.filter(m => {
      const matchBusq = !busq || m.nombre.toLowerCase().includes(busq) ||
                        (m.codigo || '').toLowerCase().includes(busq) ||
                        (m.docente_nombre || '').toLowerCase().includes(busq);
      const matchEst  = estado === '' || estado === undefined
        ? true
        : estado === '1' ? m.activa : !m.activa;
      return matchBusq && matchEst;
    });

    lista = lista.slice().sort((a, b) => {
      let va = a[_sortBy] ?? '', vb = b[_sortBy] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
    });

    renderTabla(lista);
  };

  /* ── render tabla ───────────────────────────────────────── */
  const renderTabla = (lista) => {
    const user = App.getUser();
    const container = document.getElementById('materias-container');

    if (!lista.length) {
      UI.empty('materias-container',
        _todos.length ? 'Ninguna materia coincide con la búsqueda' : 'No hay materias registradas',
        'book-x');
      return;
    }

    const th = (col, label, extra = '') =>
      `<th style="cursor:pointer;user-select:none" data-sort="${col}" ${extra}>
        ${label} <i class="bi ${sortIcon(col)} ms-1 small"></i>
      </th>`;

    container.innerHTML = `
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-sgca table-hover mb-0">
            <thead><tr>
              ${th('nombre',       'Materia')}
              <th>Código</th>
              ${th('curso_nombre', 'Curso')}
              <th>Turno</th>
              ${th('horas_semanales', 'Hs/sem.', 'class="text-center"')}
              ${th('docente_nombre',  'Docente')}
              <th class="text-center">Clases</th>
              ${th('activa', 'Estado')}
              ${['DIRECTIVO','ADMINISTRADOR'].includes(user.rol) ? '<th>Acciones</th>' : ''}
            </tr></thead>
            <tbody>
              ${lista.map(m => `<tr>
                <td><strong>${m.nombre}</strong></td>
                <td><code class="small">${m.codigo || '—'}</code></td>
                <td>${m.curso_nombre}</td>
                <td><span class="badge bg-light text-dark border">${titleCase(m.turno) || '—'}</span></td>
                <td class="text-center">${m.horas_semanales || '—'}</td>
                <td>${m.docente_nombre || '<span class="text-muted fst-italic">Sin asignar</span>'}</td>
                <td class="text-center">
                  <span class="badge bg-secondary">${m.total_clases}</span>
                  ${m.clases_aprobadas > 0
                    ? `<span class="badge bg-success ms-1">${m.clases_aprobadas} ap.</span>`
                    : ''}
                </td>
                <td>${m.activa
                  ? '<span class="badge bg-success">Activa</span>'
                  : '<span class="badge bg-secondary">Inactiva</span>'}</td>
                ${['DIRECTIVO','ADMINISTRADOR'].includes(user.rol) ? `<td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary"
                            data-editar-mat='${JSON.stringify(m).replace(/'/g, "&#39;")}'
                            title="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                  </div>
                </td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer text-muted small py-1">
          ${lista.length} materia${lista.length !== 1 ? 's' : ''}
          ${_todos.length !== lista.length ? ` de ${_todos.length}` : ''}
        </div>
      </div>`;

    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (_sortBy === col) _sortDir *= -1;
        else { _sortBy = col; _sortDir = 1; }
        aplicarFiltros();
      });
    });

    container.querySelectorAll('[data-editar-mat]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { abrirModalMateria(JSON.parse(btn.dataset.editarMat)); } catch(e) {}
      });
    });
  };

  /* ── modal crear / editar ───────────────────────────────── */
  const abrirModalMateria = async (materia = null) => {
    const isEditar = !!materia;
    document.getElementById('modal-materia-title').textContent =
      isEditar ? 'Editar Materia' : 'Nueva Materia';
    document.getElementById('materia-id').value       = materia?.id || '';
    document.getElementById('materia-nombre').value   = materia?.nombre || '';
    document.getElementById('materia-codigo').value   = materia?.codigo || '';
    document.getElementById('materia-horas').value    = materia?.horas_semanales || 4;
    document.getElementById('materia-activa').checked = materia ? materia.activa : true;
    UI.clearAlert('materia-alert');

    // Poblar cursos — solo ACTIVOS para evitar materias huérfanas
    const cursosActivos = _cursos.filter(c => c.activo);
    const cursoSel = document.getElementById('materia-curso');
    cursoSel.innerHTML = '<option value="">Seleccione curso...</option>' +
      cursosActivos.map(c =>
        `<option value="${c.id}" ${materia?.curso_id === c.id ? 'selected' : ''}>${c.nombre}</option>`
      ).join('');

    // Si editando y el curso está inactivo, mostrarlo igual pero marcado
    if (isEditar && materia.curso_id && !cursosActivos.find(c => c.id === materia.curso_id)) {
      const cursoInactivo = _cursos.find(c => c.id === materia.curso_id);
      if (cursoInactivo) {
        cursoSel.innerHTML += `<option value="${cursoInactivo.id}" selected disabled>
          ${cursoInactivo.nombre} (inactivo)
        </option>`;
        cursoSel.value = cursoInactivo.id;
      }
    }

    // Poblar docentes
    const docenteSel = document.getElementById('materia-docente');
    docenteSel.innerHTML = '<option value="">Sin asignar</option>' +
      _docentes.map(d =>
        `<option value="${d.id}" ${materia?.docente_id === d.id ? 'selected' : ''}>
          ${d.apellido}, ${d.nombre}
        </option>`
      ).join('');

    const modal = bootstrap.Modal.getOrCreateInstance(
      document.getElementById('modal-materia')
    );
    modal.show();

    // cloneNode para evitar acumulación de handlers
    const btnOrig = document.getElementById('btn-guardar-materia');
    const btn = btnOrig.cloneNode(true);
    btnOrig.parentNode.replaceChild(btn, btnOrig);

    btn.addEventListener('click', async () => {
      const nombre     = UI.getVal('materia-nombre');
      const curso_id   = UI.getVal('materia-curso');
      const docente_id = UI.getVal('materia-docente') || null;
      if (!nombre) {
        UI.modalAlert('materia-alert', 'El nombre es obligatorio');
        return;
      }
      if (!curso_id) {
        UI.modalAlert('materia-alert', 'Seleccione un curso activo');
        return;
      }
      // Verificar que el curso elegido esté activo
      const cursoElegido = _cursos.find(c => c.id === curso_id);
      if (cursoElegido && !cursoElegido.activo) {
        UI.modalAlert('materia-alert', 'No se puede asignar una materia a un curso inactivo');
        return;
      }

      const payload = {
        nombre,
        codigo:          UI.getVal('materia-codigo') || null,
        horas_semanales: parseInt(UI.getVal('materia-horas')) || 0,
        curso_id,
        docente_id,
        activa: document.getElementById('materia-activa').checked,
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';

      try {
        if (isEditar) {
          await Api.editarMateria(materia.id, payload);
          if (payload.docente_id && payload.docente_id !== materia.docente_id) {
            try { await Api.asignarMaterias(payload.docente_id, { materia_ids: [materia.id] }); } catch(e) {}
          }
          UI.toast('Materia actualizada correctamente', 'success');
        } else {
          const nuevaMateria = await Api.crearMateria(payload);
          if (payload.docente_id) {
            try { await Api.asignarMaterias(payload.docente_id, { materia_ids: [nuevaMateria.id] }); } catch(e) {}
          }
          UI.toast('Materia creada correctamente', 'success');
        }
        const modalEl = document.getElementById('modal-materia');
        modalEl.addEventListener('hidden.bs.modal', () => cargarMaterias(), { once: true });
        modal.hide();
      } catch(err) {
        UI.modalAlert('materia-alert', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-1"></i>Guardar';
      }
    });
  };

  return { render };
})();
