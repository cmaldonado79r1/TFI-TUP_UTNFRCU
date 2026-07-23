/* ── Vista Cursos (Directivo / Administrador) ─────────────── */
const CursosView = (() => {

  const TURNOS = ['Mañana', 'Tarde', 'Noche', 'Vespertino'];

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
      <div id="cursos-container"></div>
    </div>`;

    document.getElementById('btn-nuevo-curso').addEventListener('click', () => abrirModal());
    cargarCursos();
  };

  const cargarCursos = async () => {
    UI.loader('cursos-container');
    try {
      const cursos = await Api.getCursos();
      if (!cursos.length) {
        UI.empty('cursos-container', 'No hay cursos registrados', 'building');
        return;
      }
      document.getElementById('cursos-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>Nombre</th>
                <th>Nivel</th>
                <th>Turno</th>
                <th>Año lectivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody>
                ${cursos.map(c => `<tr>
                  <td><strong>${c.nombre}</strong></td>
                  <td><span class="badge bg-primary">${c.nivel}° año</span></td>
                  <td><span class="badge bg-light text-dark border">${c.turno}</span></td>
                  <td>${c.anio_lectivo}</td>
                  <td>
                    ${c.activo
                      ? '<span class="badge bg-success">Activo</span>'
                      : '<span class="badge bg-secondary">Inactivo</span>'}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary"
                            data-editar-curso='${JSON.stringify(c).replace(/'/g,"&#39;")}'>
                      <i class="bi bi-pencil"></i>
                    </button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      document.querySelectorAll('[data-editar-curso]').forEach(btn => {
        btn.addEventListener('click', () => {
          try { abrirModal(JSON.parse(btn.dataset.editarCurso)); } catch(e) {}
        });
      });
    } catch(e) {
      document.getElementById('cursos-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const abrirModal = (curso = null) => {
    const isEditar = !!curso;
    document.getElementById('modal-curso-title').textContent =
      isEditar ? 'Editar Curso' : 'Nuevo Curso';
    document.getElementById('curso-id').value      = curso?.id || '';
    document.getElementById('curso-nombre').value  = curso?.nombre || '';
    document.getElementById('curso-nivel').value   = curso?.nivel || 1;
    document.getElementById('curso-anio').value    = curso?.anio_lectivo || new Date().getFullYear();
    document.getElementById('curso-activo').checked = curso ? curso.activo : true;
    UI.clearAlert('curso-alert');

    const turnoSel = document.getElementById('curso-turno');
    turnoSel.innerHTML = TURNOS.map(t =>
      `<option value="${t}" ${curso?.turno === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-curso'));
    modal.show();

    // Reemplazar handler para evitar apilado de eventos
    const btn = document.getElementById('btn-guardar-curso');
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);

    document.getElementById('btn-guardar-curso').addEventListener('click', async () => {
      const nombre      = UI.getVal('curso-nombre');
      const nivel       = parseInt(UI.getVal('curso-nivel'));
      const turno       = UI.getVal('curso-turno');
      const anio_lectivo = parseInt(UI.getVal('curso-anio'));

      if (!nombre || !nivel || !turno || !anio_lectivo) {
        UI.modalAlert('curso-alert', 'Todos los campos son obligatorios');
        return;
      }

      const payload = {
        nombre, nivel, turno, anio_lectivo,
        activo: document.getElementById('curso-activo').checked
      };

      try {
        if (isEditar) {
          await Api.editarCurso(curso.id, payload);
          UI.toast('Curso actualizado correctamente', 'success');
        } else {
          await Api.crearCurso(payload);
          UI.toast('Curso creado correctamente', 'success');
        }
        modal.hide();
        cargarCursos();
      } catch(err) {
        UI.modalAlert('curso-alert', err.message);
      }
    });
  };

  return { render };
})();
