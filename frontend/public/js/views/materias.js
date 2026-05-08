/* ── Vista Materias ───────────────────────────────────────── */
const MateriasView = (() => {
  let _cursos   = [];
  let _docentes = [];

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
              <label class="form-label small mb-1">Curso</label>
              <select id="filtro-mat-curso" class="form-select form-select-sm">
                <option value="">Todos los cursos</option>
              </select>
            </div>
            <div class="col-sm-3">
              <button class="btn btn-primary btn-sm w-100" id="btn-filtrar-mat">
                <i class="bi bi-search me-1"></i>Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="materias-container"></div>
    </div>`;

    try {
      _cursos   = await Api.getCursos();
      UI.fillSelect('filtro-mat-curso', _cursos, 'id', 'nombre', 'Todos los cursos');
    } catch(e) {}

    if (['DIRECTIVO','ADMINISTRADOR'].includes(user.rol)) {
      try { _docentes = await Api.getUsuarios({ rol: 'DOCENTE', estado: 'true' }); } catch(e) {}
      document.getElementById('btn-nueva-materia')
        .addEventListener('click', () => abrirModalMateria());
    }

    document.getElementById('btn-filtrar-mat').addEventListener('click', cargarMaterias);
    cargarMaterias();
  };

  const cargarMaterias = async () => {
    UI.loader('materias-container');
    try {
      const params = { curso_id: UI.getVal('filtro-mat-curso') };
      const materias = await Api.getMaterias(params);
      if (!materias.length) {
        UI.empty('materias-container', 'No hay materias registradas', 'book-x');
        return;
      }
      const user = App.getUser();
      document.getElementById('materias-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>Materia</th><th>Código</th><th>Curso</th><th>Turno</th>
                <th>Hs/sem.</th><th>Docente</th><th>Clases</th><th>Estado</th>
                ${['DIRECTIVO','ADMINISTRADOR'].includes(user.rol) ? '<th>Acciones</th>' : ''}
              </tr></thead>
              <tbody>
                ${materias.map(m => `<tr>
                  <td><strong>${m.nombre}</strong></td>
                  <td><code class="small">${m.codigo || '—'}</code></td>
                  <td>${m.curso_nombre}</td>
                  <td><span class="badge bg-light text-dark border">${m.turno || '—'}</span></td>
                  <td class="text-center">${m.horas_semanales || '—'}</td>
                  <td>${m.docente_nombre || '<span class="text-muted">Sin asignar</span>'}</td>
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
                              data-editar-mat='${JSON.stringify(m).replace(/'/g,"&#39;")}'
                              title="Editar">
                        <i class="bi bi-pencil"></i>
                      </button>
                    </div>
                  </td>` : ''}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      document.querySelectorAll('[data-editar-mat]').forEach(btn => {
        btn.addEventListener('click', () => {
          try { abrirModalMateria(JSON.parse(btn.dataset.editarMat)); } catch(e) {}
        });
      });
    } catch(e) {
      document.getElementById('materias-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const abrirModalMateria = async (materia = null) => {
    const isEditar = !!materia;
    document.getElementById('modal-materia-title').textContent =
      isEditar ? 'Editar Materia' : 'Nueva Materia';
    document.getElementById('materia-id').value      = materia?.id || '';
    document.getElementById('materia-nombre').value  = materia?.nombre || '';
    document.getElementById('materia-codigo').value  = materia?.codigo || '';
    document.getElementById('materia-horas').value   = materia?.horas_semanales || 4;
    document.getElementById('materia-activa').checked = materia ? materia.activa : true;
    UI.clearAlert('materia-alert');

    // Poblar cursos
    UI.fillSelect('materia-curso', _cursos, 'id', 'nombre', 'Seleccione curso...');
    if (materia?.curso_id) document.getElementById('materia-curso').value = materia.curso_id;

    // Poblar docentes
    const docenteSel = document.getElementById('materia-docente');
    docenteSel.innerHTML = '<option value="">Seleccione docente...</option>' +
      _docentes.map(d =>
        `<option value="${d.id}" ${materia?.docente_id === d.id ? 'selected' : ''}>
          ${d.apellido}, ${d.nombre}
        </option>`
      ).join('');

    const modal = bootstrap.Modal.getOrCreateInstance(
      document.getElementById('modal-materia')
    );
    modal.show();

    document.getElementById('btn-guardar-materia').onclick = async () => {
      const nombre     = UI.getVal('materia-nombre');
      const curso_id   = UI.getVal('materia-curso');
      const docente_id = UI.getVal('materia-docente') || null;
      if (!nombre || !curso_id) {
        UI.modalAlert('materia-alert', 'Nombre y curso son obligatorios');
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
      try {
        if (isEditar) {
          await Api.editarMateria(materia.id, payload);
          // Si cambia el docente, actualizar la asignación en docente_materias
          if (payload.docente_id && payload.docente_id !== materia.docente_id) {
            try {
              await Api.asignarMaterias(payload.docente_id, {
                materia_ids: [materia.id],
              });
            } catch(e) {}
          }
          UI.toast('Materia actualizada correctamente', 'success');
        } else {
          const nuevaMateria = await Api.crearMateria(payload);
          // Crear la asignación en docente_materias solo si hay docente
          if (payload.docente_id) {
            try {
              await Api.asignarMaterias(payload.docente_id, {
                materia_ids: [nuevaMateria.id],
              });
            } catch(e) {}
          }
          UI.toast('Materia creada correctamente', 'success');
        }
        modal.hide();
        cargarMaterias();
      } catch(err) {
        UI.modalAlert('materia-alert', err.message);
      }
    };
  };

  return { render };
})();
