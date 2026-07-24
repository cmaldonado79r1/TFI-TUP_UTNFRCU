/* ── Vista Cursos (Directivo / Administrador) ─────────────── */
const CursosView = (() => {

  const TURNOS = ['Mañana', 'Tarde', 'Noche', 'Vespertino'];

  let _todos  = [];   // caché completa
  let _sortBy = 'nombre';
  let _sortDir = 1;   // 1 asc, -1 desc
  const user  = () => App.getUser();

  /* ── helpers de display ─────────────────────────────────── */
  const titleCase = (s) => s
    ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    : s;

  const sortIcon = (col) => _sortBy !== col ? 'bi-arrow-down-up text-muted' :
    (_sortDir === 1 ? 'bi-arrow-up' : 'bi-arrow-down');

  /* ── render principal ───────────────────────────────────── */
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold">
          <i class="bi bi-building me-2"></i>Gestión de Cursos
        </h4>
        <button class="btn btn-success" id="btn-nuevo-curso">
          <i class="bi bi-plus-lg me-1"></i>Nuevo curso
        </button>
      </div>

      <!-- Búsqueda -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-5">
              <label class="form-label small mb-1">Buscar</label>
              <div class="input-group input-group-sm">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="busq-curso" class="form-control"
                       placeholder="Nombre del curso...">
              </div>
            </div>
            <div class="col-sm-3">
              <label class="form-label small mb-1">Turno</label>
              <select id="filtro-curso-turno" class="form-select form-select-sm">
                <option value="">Todos los turnos</option>
                ${TURNOS.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="col-sm-2">
              <label class="form-label small mb-1">Estado</label>
              <select id="filtro-curso-estado" class="form-select form-select-sm">
                <option value="">Todos</option>
                <option value="1">Activos</option>
                <option value="0">Inactivos</option>
              </select>
            </div>
            <div class="col-sm-2 d-flex gap-1 align-items-end">
              <button class="btn btn-outline-secondary btn-sm w-100" id="btn-limpiar-curso">
                <i class="bi bi-x-lg me-1"></i>Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="cursos-container"></div>
    </div>`;

    document.getElementById('btn-nuevo-curso').addEventListener('click', () => abrirModal());
    document.getElementById('busq-curso').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-curso-turno').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-curso-estado').addEventListener('change', aplicarFiltros);
    document.getElementById('btn-limpiar-curso').addEventListener('click', () => {
      document.getElementById('busq-curso').value = '';
      document.getElementById('filtro-curso-turno').value = '';
      document.getElementById('filtro-curso-estado').value = '';
      aplicarFiltros();
    });

    await cargarCursos();
  };

  /* ── carga desde API ────────────────────────────────────── */
  const cargarCursos = async () => {
    UI.loader('cursos-container');
    try {
      _todos = await Api.getCursos();
      aplicarFiltros();
    } catch(e) {
      document.getElementById('cursos-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  /* ── filtrado + ordenamiento en cliente ─────────────────── */
  const aplicarFiltros = () => {
    const busq   = (document.getElementById('busq-curso')?.value || '').toLowerCase();
    const turno  = document.getElementById('filtro-curso-turno')?.value || '';
    const estado = document.getElementById('filtro-curso-estado')?.value;

    let lista = _todos.filter(c => {
      const matchBusq  = !busq  || c.nombre.toLowerCase().includes(busq);
      const matchTurno = !turno || titleCase(c.turno) === turno;
      const matchEst   = estado === '' || estado === undefined
        ? true
        : estado === '1' ? c.activo : !c.activo;
      return matchBusq && matchTurno && matchEst;
    });

    // Ordenar
    lista = lista.slice().sort((a, b) => {
      let va = a[_sortBy], vb = b[_sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
    });

    renderTabla(lista);
  };

  /* ── render tabla ───────────────────────────────────────── */
  const renderTabla = (lista) => {
    const container = document.getElementById('cursos-container');
    if (!lista.length) {
      UI.empty('cursos-container',
        _todos.length ? 'Ningún curso coincide con la búsqueda' : 'No hay cursos registrados',
        'building');
      return;
    }

    const th = (col, label) =>
      `<th style="cursor:pointer;user-select:none" data-sort="${col}">
        ${label} <i class="bi ${sortIcon(col)} ms-1 small"></i>
      </th>`;

    container.innerHTML = `
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-sgca table-hover mb-0">
            <thead><tr>
              ${th('nombre',       'Nombre')}
              ${th('nivel',        'Nivel')}
              ${th('turno',        'Turno')}
              ${th('anio_lectivo', 'Año lectivo')}
              <th>Materias</th>
              ${th('activo',       'Estado')}
              <th>Acciones</th>
            </tr></thead>
            <tbody>
              ${lista.map(c => `<tr class="${!c.activo ? 'table-secondary text-muted' : ''}">
                <td><strong>${c.nombre}</strong></td>
                <td><span class="badge bg-primary">${c.nivel}° año</span></td>
                <td><span class="badge bg-light text-dark border">${titleCase(c.turno)}</span></td>
                <td>${c.anio_lectivo}</td>
                <td>
                  <span class="badge ${c.total_materias > 0 ? 'bg-info text-dark' : 'bg-light text-muted border'}">
                    ${c.total_materias}
                  </span>
                </td>
                <td>
                  ${c.activo
                    ? '<span class="badge bg-success">Activo</span>'
                    : '<span class="badge bg-secondary">Inactivo</span>'}
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary"
                          data-editar-curso='${JSON.stringify(c).replace(/'/g, "&#39;")}'>
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer text-muted small py-1">
          ${lista.length} curso${lista.length !== 1 ? 's' : ''}
          ${_todos.length !== lista.length ? ` de ${_todos.length}` : ''}
        </div>
      </div>`;

    // Ordenamiento por clic en cabecera
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (_sortBy === col) _sortDir *= -1;
        else { _sortBy = col; _sortDir = 1; }
        aplicarFiltros();
      });
    });

    // Editar
    container.querySelectorAll('[data-editar-curso]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { abrirModal(JSON.parse(btn.dataset.editarCurso)); } catch(e) {}
      });
    });
  };

  /* ── modal crear / editar ───────────────────────────────── */
  const abrirModal = (curso = null) => {
    const isEditar = !!curso;
    document.getElementById('modal-curso-title').textContent =
      isEditar ? 'Editar Curso' : 'Nuevo Curso';
    document.getElementById('curso-id').value       = curso?.id || '';
    document.getElementById('curso-nombre').value   = curso?.nombre || '';
    document.getElementById('curso-nivel').value    = curso?.nivel || 1;
    document.getElementById('curso-anio').value     = curso?.anio_lectivo || new Date().getFullYear();
    document.getElementById('curso-activo').checked = curso ? curso.activo : true;
    UI.clearAlert('curso-alert');

    const turnoSel = document.getElementById('curso-turno');
    const turnoActual = curso?.turno ? titleCase(curso.turno) : '';
    turnoSel.innerHTML = TURNOS.map(t =>
      `<option value="${t}" ${turnoActual === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    // Mostrar/ocultar aviso de materias al cambiar estado
    const checkActivo = document.getElementById('curso-activo');
    const actualizarAviso = () => {
      const aviso = document.getElementById('curso-aviso-materias');
      if (!aviso) return;
      if (isEditar && curso.activo && !checkActivo.checked && curso.total_materias > 0) {
        aviso.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>
          Este curso tiene <strong>${curso.total_materias} materia${curso.total_materias > 1 ? 's' : ''}</strong> asociada${curso.total_materias > 1 ? 's' : ''}.
          Al desactivarlo no podrás asignarle nuevas materias, pero las existentes quedarán intactas.
          Para desactivarlo completamente primero reasigná o eliminá las materias.`;
        aviso.className = 'alert alert-warning small py-2 mt-2 mb-0';
      } else {
        aviso.innerHTML = '';
        aviso.className = 'd-none';
      }
    };
    checkActivo.addEventListener('change', actualizarAviso);

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-curso'));

    // Insertar div de aviso antes del alert general si no existe
    const modalBody = document.querySelector('#modal-curso .modal-body');
    if (!document.getElementById('curso-aviso-materias')) {
      const div = document.createElement('div');
      div.id = 'curso-aviso-materias';
      div.className = 'd-none';
      const alertEl = document.getElementById('curso-alert');
      modalBody.insertBefore(div, alertEl);
    } else {
      document.getElementById('curso-aviso-materias').className = 'd-none';
      document.getElementById('curso-aviso-materias').innerHTML = '';
    }

    modal.show();

    // cloneNode para evitar acumulación de handlers
    const btnOrig = document.getElementById('btn-guardar-curso');
    const btn = btnOrig.cloneNode(true);
    btnOrig.parentNode.replaceChild(btn, btnOrig);

    btn.addEventListener('click', async () => {
      const nombre       = UI.getVal('curso-nombre');
      const nivel        = parseInt(UI.getVal('curso-nivel'));
      const turno        = UI.getVal('curso-turno');
      const anio_lectivo = parseInt(UI.getVal('curso-anio'));

      if (!nombre || !nivel || !turno || !anio_lectivo) {
        UI.modalAlert('curso-alert', 'Todos los campos son obligatorios');
        return;
      }

      const payload = {
        nombre, nivel, turno, anio_lectivo,
        activo: document.getElementById('curso-activo').checked
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';

      try {
        if (isEditar) {
          await Api.editarCurso(curso.id, payload);
          UI.toast('Curso actualizado correctamente', 'success');
        } else {
          await Api.crearCurso(payload);
          UI.toast('Curso creado correctamente', 'success');
        }
        const modalEl = document.getElementById('modal-curso');
        modalEl.addEventListener('hidden.bs.modal', () => cargarCursos(), { once: true });
        modal.hide();
      } catch(err) {
        UI.modalAlert('curso-alert', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-1"></i>Guardar';
      }
    });
  };

  return { render };
})();
