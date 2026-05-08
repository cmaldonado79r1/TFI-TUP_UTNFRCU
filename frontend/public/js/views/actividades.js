/* ── Vista Actividades por Materia (Docente) ─────────────── */
const ActividadesView = (() => {
  let _materias  = [];
  let _matActual = null;

  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold">
          <i class="bi bi-list-task me-2"></i>Actividades por Materia
        </h4>
      </div>
      <!-- Selector de materia -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-5">
              <label class="form-label small mb-1 fw-semibold">Seleccionar Materia</label>
              <select id="act-sel-materia" class="form-select">
                <option value="">-- Elegir materia --</option>
              </select>
            </div>
            <div class="col-sm-3">
              <button class="btn btn-primary btn-sm w-100" id="btn-act-ver">
                <i class="bi bi-eye me-1"></i>Ver actividades
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="actividades-materia-container">
        <div class="text-center text-muted py-5">
          <i class="bi bi-list-task fs-1 opacity-25"></i>
          <p class="mt-2">Seleccioná una materia para ver sus actividades</p>
        </div>
      </div>
    </div>`;

    try {
      _materias = await Api.getMaterias();
      const sel = document.getElementById('act-sel-materia');
      sel.innerHTML = '<option value="">-- Elegir materia --</option>' +
        _materias.map(m =>
          `<option value="${m.id}">${m.nombre} – ${m.curso_nombre}</option>`
        ).join('');
    } catch(e) {
      document.getElementById('actividades-materia-container').innerHTML =
        `<div class="alert alert-danger">Error al cargar materias: ${e.message}</div>`;
      return;
    }

    document.getElementById('btn-act-ver').addEventListener('click', () => {
      const matId = UI.getVal('act-sel-materia');
      if (!matId) { UI.toast('Seleccioná una materia', 'warning'); return; }
      _matActual = _materias.find(m => m.id === matId);
      cargarActividadesMateria(matId);
    });
  };

  /* Carga todas las clases de la materia y sus actividades */
  const cargarActividadesMateria = async (materia_id) => {
    const cont = document.getElementById('actividades-materia-container');
    cont.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;
    try {
      const clases = await Api.getClases({ materia_id });

      if (!clases.length) {
        cont.innerHTML = `
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No hay clases registradas para <strong>${_matActual?.nombre || 'esta materia'}</strong>.
            Registrá una clase primero desde <strong>Mis Clases</strong>.
          </div>`;
        return;
      }

      // Para cada clase, cargar sus actividades
      const clasesConActs = await Promise.all(
        clases.map(async (c) => {
          try {
            const acts = await Api.getActividades(c.id);
            return { ...c, actividades: acts };
          } catch(e) {
            return { ...c, actividades: [] };
          }
        })
      );

      const totalActividades = clasesConActs.reduce(
        (sum, c) => sum + c.actividades.length, 0
      );

      cont.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="mb-0 fw-bold text-success">
            <i class="bi bi-book me-2"></i>${_matActual?.nombre}
            <small class="text-muted fw-normal ms-2">${_matActual?.curso_nombre}</small>
          </h5>
          <span class="badge bg-success fs-6">${totalActividades} actividad${totalActividades !== 1 ? 'es' : ''}</span>
        </div>
        ${clasesConActs.map(c => renderClaseConActividades(c)).join('')}`;

      // Eventos para agregar/eliminar actividades
      document.querySelectorAll('[data-add-act-clase]').forEach(btn => {
        btn.addEventListener('click', () => abrirFormAgregarActividad(btn.dataset.addActClase, btn.dataset.claseEstado));
      });
      document.querySelectorAll('[data-del-act]').forEach(btn => {
        btn.addEventListener('click', () => eliminarActividad(btn.dataset.delAct, materia_id));
      });
    } catch(e) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const renderClaseConActividades = (c) => {
    const esMutable = c.estado !== 'INMUTABLE' && c.estado !== 'APROBADO';
    return `
      <div class="card shadow-sm mb-3">
        <div class="card-header d-flex align-items-center justify-content-between py-2">
          <div>
            <span class="fw-semibold">${UI.fecha(c.fecha)}</span>
            <span class="text-muted ms-2 small">— Clase N° ${c.numero_clase || '?'}</span>
            <span class="ms-2">${UI.estadoBadge(c.estado)}</span>
            <span class="badge bg-light text-dark border ms-2">${c.caracter}</span>
          </div>
          ${esMutable ? `
          <button class="btn btn-outline-success btn-sm"
                  data-add-act-clase="${c.id}"
                  data-clase-estado="${c.estado}"
                  title="Agregar actividad">
            <i class="bi bi-plus-lg me-1"></i>Agregar
          </button>` : `<span class="badge bg-secondary">Inmutable</span>`}
        </div>
        <div class="card-body p-0">
          ${c.actividades.length === 0
            ? `<p class="text-muted small p-3 mb-0">
                 <i class="bi bi-dash-circle me-1"></i>Sin actividades registradas en esta clase.
               </p>`
            : `<table class="table table-sm table-hover mb-0">
                 <thead class="table-light">
                   <tr>
                     <th style="width:120px">Tipo</th>
                     <th>Nombre</th>
                     <th>Descripción</th>
                     ${esMutable ? '<th style="width:60px"></th>' : ''}
                   </tr>
                 </thead>
                 <tbody>
                   ${c.actividades.map(a => `
                     <tr>
                       <td><span class="badge bg-secondary">${a.tipo}</span></td>
                       <td><strong>${a.nombre}</strong></td>
                       <td class="text-muted small">${a.descripcion || '—'}</td>
                       ${esMutable ? `<td>
                         <button class="btn btn-outline-danger btn-sm"
                                 data-del-act="${a.id}"
                                 title="Eliminar">
                           <i class="bi bi-trash"></i>
                         </button>
                       </td>` : ''}
                     </tr>`).join('')}
                 </tbody>
               </table>`}
        </div>
      </div>`;
  };

  const abrirFormAgregarActividad = (claseId, claseEstado) => {
    if (claseEstado === 'INMUTABLE' || claseEstado === 'APROBADO') {
      UI.toast('Esta clase está inmutable o aprobada, no se puede modificar', 'warning');
      return;
    }

    // Crear un mini-modal inline con SweetAlert-style usando un div temporal
    const existing = document.getElementById('inline-add-act-' + claseId);
    if (existing) { existing.remove(); return; }

    const formHtml = `
      <div id="inline-add-act-${claseId}" class="card border-success mt-2 mx-3 mb-3">
        <div class="card-header bg-success bg-opacity-10 py-2 d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-success small">
            <i class="bi bi-plus-circle me-1"></i>Nueva actividad
          </span>
          <button type="button" class="btn-close btn-sm" id="btn-cancel-act-${claseId}"></button>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-3">
              <label class="form-label small fw-semibold mb-1">Tipo</label>
              <select class="form-select form-select-sm" id="new-act-tipo-${claseId}">
                <option value="PRÁCTICA">Práctica</option>
                <option value="TAREA">Tarea</option>
                <option value="LABORATORIO">Laboratorio</option>
                <option value="PROYECTO">Proyecto</option>
                <option value="EXPOSICION">Exposición</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold mb-1">Nombre *</label>
              <input type="text" class="form-control form-control-sm"
                     id="new-act-nombre-${claseId}" placeholder="Nombre de la actividad..."/>
            </div>
            <div class="col-md-5">
              <label class="form-label small fw-semibold mb-1">Descripción</label>
              <input type="text" class="form-control form-control-sm"
                     id="new-act-desc-${claseId}" placeholder="Descripción opcional..."/>
            </div>
          </div>
          <div class="text-end mt-2">
            <button class="btn btn-success btn-sm" id="btn-save-act-${claseId}">
              <i class="bi bi-check-lg me-1"></i>Guardar actividad
            </button>
          </div>
          <div id="act-inline-alert-${claseId}" class="alert d-none mt-2"></div>
        </div>
      </div>`;

    // Insertar después del card-header del elemento padre
    const parentCard = document.querySelector(`[data-add-act-clase="${claseId}"]`)
      ?.closest('.card');
    if (parentCard) {
      parentCard.insertAdjacentHTML('afterend', formHtml);
    }

    document.getElementById(`btn-cancel-act-${claseId}`)?.addEventListener('click', () => {
      document.getElementById(`inline-add-act-${claseId}`)?.remove();
    });

    document.getElementById(`btn-save-act-${claseId}`)?.addEventListener('click', async () => {
      const nombre = document.getElementById(`new-act-nombre-${claseId}`)?.value.trim();
      if (!nombre) {
        const alertEl = document.getElementById(`act-inline-alert-${claseId}`);
        alertEl.className = 'alert alert-warning';
        alertEl.textContent = 'El nombre es requerido';
        alertEl.classList.remove('d-none');
        return;
      }
      try {
        await Api.crearActividad({
          clase_id:    claseId,
          nombre,
          tipo:        document.getElementById(`new-act-tipo-${claseId}`)?.value || 'PRÁCTICA',
          descripcion: document.getElementById(`new-act-desc-${claseId}`)?.value.trim() || null,
        });
        UI.toast('Actividad agregada correctamente', 'success');
        document.getElementById(`inline-add-act-${claseId}`)?.remove();
        // Recargar la vista de la materia
        const matId = UI.getVal('act-sel-materia');
        if (matId) cargarActividadesMateria(matId);
      } catch(err) {
        const alertEl = document.getElementById(`act-inline-alert-${claseId}`);
        alertEl.className = 'alert alert-danger';
        alertEl.textContent = err.message;
        alertEl.classList.remove('d-none');
      }
    });
  };

  const eliminarActividad = async (actId, materia_id) => {
    if (!UI.confirm('¿Eliminar esta actividad?')) return;
    try {
      await Api.eliminarActividad(actId);
      UI.toast('Actividad eliminada', 'success');
      cargarActividadesMateria(materia_id);
    } catch(e) {
      UI.toast(e.message, 'error');
    }
  };

  return { render };
})();
