/* ── Vista Evaluaciones ──────────────────────────────────── */
const EvaluacionesView = (() => {
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold">
          <i class="bi bi-calendar-check me-2"></i>Evaluaciones
        </h4>
        <button class="btn btn-info text-white" id="btn-nueva-eval">
          <i class="bi bi-plus-lg me-1"></i>Nueva evaluación
        </button>
      </div>
      <div id="evaluaciones-container"></div>
    </div>`;
    document.getElementById('btn-nueva-eval').addEventListener('click', abrirModalEval);
    cargarEvaluaciones();
  };

  const cargarEvaluaciones = async () => {
    UI.loader('evaluaciones-container');
    try {
      const evals = await Api.getEvaluaciones();
      if (!evals.length) {
        UI.empty('evaluaciones-container', 'No hay evaluaciones registradas', 'calendar-x');
        return;
      }
      document.getElementById('evaluaciones-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Materia</th>
                <th>Curso</th>
                <th>Docente</th>
                <th>Bloqueada</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody>
                ${evals.map(e => `<tr>
                  <td>${UI.fecha(e.fecha)}</td>
                  <td>${e.nombre || '<span class="text-muted">Sin nombre</span>'}</td>
                  <td><strong>${e.materia_nombre}</strong></td>
                  <td><span class="badge bg-light text-dark border">${e.curso_nombre || '—'}</span></td>
                  <td class="text-muted small">${e.docente_nombre}</td>
                  <td>${e.bloqueada
                    ? '<span class="badge bg-danger"><i class="bi bi-lock-fill me-1"></i>Bloqueada</span>'
                    : '<span class="badge bg-secondary">Libre</span>'}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-info"
                              data-toggle-bloqueo="${e.id}"
                              data-bloqueada="${e.bloqueada}"
                              title="${e.bloqueada ? 'Desbloquear' : 'Bloquear'}">
                        <i class="bi bi-${e.bloqueada ? 'unlock' : 'lock'}"></i>
                      </button>
                      <button class="btn btn-outline-danger"
                              data-eliminar-eval="${e.id}"
                              title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      document.querySelectorAll('[data-toggle-bloqueo]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.toggleBloqueo;
          const bloqueada = btn.dataset.bloqueada === 'true';
          try {
            await Api.editarEvaluacion(id, { bloqueada: !bloqueada });
            UI.toast(`Evaluación ${!bloqueada ? 'bloqueada' : 'desbloqueada'}`, 'success');
            cargarEvaluaciones();
          } catch(e) { UI.toast(e.message, 'error'); }
        });
      });

      document.querySelectorAll('[data-eliminar-eval]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!UI.confirm('¿Eliminar esta evaluación?')) return;
          try {
            await Api.eliminarEvaluacion(btn.dataset.eliminarEval);
            UI.toast('Evaluación eliminada', 'success');
            cargarEvaluaciones();
          } catch(e) { UI.toast(e.message, 'error'); }
        });
      });
    } catch(e) {
      document.getElementById('evaluaciones-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const abrirModalEval = async () => {
    UI.clearAlert('eval-alert');
    document.getElementById('eval-nombre').value = '';
    document.getElementById('eval-fecha').value  = '';
    document.getElementById('eval-bloqueada').checked = false;

    try {
      // Cargar materias con curso incluido en el label
      const materias = await Api.getMaterias();
      const sel = document.getElementById('eval-materia');
      sel.innerHTML = '<option value="">Seleccione materia…</option>' +
        materias.map(m =>
          `<option value="${m.id}" data-curso-id="${m.curso_id || ''}" data-curso="${m.curso_nombre || ''}">
            ${m.nombre}${m.curso_nombre ? ' — ' + m.curso_nombre : ''}
          </option>`
        ).join('');

      // Ocultar select de curso suelto — se infiere de la materia seleccionada
      const cursoRow = document.getElementById('eval-curso-row');
      if (cursoRow) cursoRow.style.display = 'none';
    } catch(e) {}

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-evaluacion'));
    modal.show();

    // Clonar botón para evitar apilado de eventos
    const btnOld = document.getElementById('btn-guardar-evaluacion');
    const btnNew = btnOld.cloneNode(true);
    btnOld.parentNode.replaceChild(btnNew, btnOld);

    document.getElementById('btn-guardar-evaluacion').addEventListener('click', async () => {
      const materiaOpt = document.getElementById('eval-materia').selectedOptions[0];
      const materia_id = UI.getVal('eval-materia');
      const curso_id   = materiaOpt?.dataset?.cursoId || null;
      const fecha      = UI.getVal('eval-fecha');

      if (!materia_id || !fecha) {
        UI.modalAlert('eval-alert', 'Materia y fecha son requeridos', 'danger');
        return;
      }
      try {
        await Api.crearEvaluacion({
          materia_id,
          curso_id,
          fecha,
          nombre:    UI.getVal('eval-nombre'),
          bloqueada: document.getElementById('eval-bloqueada').checked,
        });
        UI.toast('Evaluación programada correctamente', 'success');
        modal.hide();
        cargarEvaluaciones();
      } catch(err) { UI.modalAlert('eval-alert', err.message); }
    });
  };

  return { render };
})();
