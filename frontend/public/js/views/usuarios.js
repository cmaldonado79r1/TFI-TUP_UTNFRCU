/* ── Vista Usuarios ──────────────────────────────────────── */
const UsuariosView = (() => {
  let _roles    = [];
  let _materias = [];

  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-people me-2"></i>Gestión de Usuarios</h4>
        <button class="btn btn-primary" id="btn-nuevo-usuario"><i class="bi bi-person-plus me-1"></i>Nuevo usuario</button>
      </div>
      <!-- Filtros -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-4"><label class="form-label small mb-1">Rol</label>
              <select id="filtro-rol-usr" class="form-select form-select-sm">
                <option value="">Todos los roles</option>
                <option value="DOCENTE">Docente</option>
                <option value="DIRECTIVO">Directivo</option>
                <option value="ASESOR_PEDAGOGICO">Asesor Pedagógico</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select></div>
            <div class="col-sm-3"><label class="form-label small mb-1">Estado</label>
              <select id="filtro-estado-usr" class="form-select form-select-sm">
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select></div>
            <div class="col-sm-3">
              <button class="btn btn-primary btn-sm w-100" id="btn-filtrar-usr"><i class="bi bi-search me-1"></i>Filtrar</button>
            </div>
          </div>
        </div>
      </div>
      <div id="usuarios-container"></div>
    </div>`;

    try { _roles    = await Api.getRoles(); }    catch(e) {}
    try { _materias = await Api.getMaterias(); } catch(e) {}

    document.getElementById('btn-nuevo-usuario').addEventListener('click', () => abrirModalUsuario());
    document.getElementById('btn-filtrar-usr').addEventListener('click', cargarUsuarios);
    cargarUsuarios();
  };

  const cargarUsuarios = async () => {
    UI.loader('usuarios-container');
    try {
      const params = {
        rol:    UI.getVal('filtro-rol-usr'),
        estado: UI.getVal('filtro-estado-usr'),
      };
      const usuarios = await Api.getUsuarios(params);
      if (!usuarios.length) { UI.empty('usuarios-container', 'No hay usuarios registrados', 'person-x'); return; }
      document.getElementById('usuarios-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                ${usuarios.map(u => `<tr>
                  <td><strong>${u.apellido}, ${u.nombre}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge ${rolColor(u.rol)}">${rolLabel(u.rol)}</span></td>
                  <td>${u.estado
                    ? '<span class="badge bg-success">Activo</span>'
                    : '<span class="badge bg-danger">Inactivo</span>'}</td>
                  <td class="text-muted small">${UI.fechaHora(u.ultimo_acceso)}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" data-editar-usr='${JSON.stringify(u).replace(/'/g, "&#39;")}' title="Editar">
                        <i class="bi bi-pencil"></i>
                      </button>
                      ${u.rol === 'DOCENTE' ? `
                      <button class="btn btn-outline-info" data-materias-usr="${u.id}" data-nombre="${u.nombre} ${u.apellido}" title="Asignar materias">
                        <i class="bi bi-book"></i>
                      </button>` : ''}
                      <button class="btn btn-outline-warning" data-reset-pwd="${u.id}" title="Resetear contraseña">
                        <i class="bi bi-key"></i>
                      </button>
                      <button class="btn btn-outline-${u.estado ? 'danger' : 'success'}" data-toggle-usr="${u.id}" data-estado="${u.estado}" title="${u.estado ? 'Desactivar' : 'Activar'}">
                        <i class="bi bi-${u.estado ? 'person-dash' : 'person-check'}"></i>
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      document.querySelectorAll('[data-editar-usr]').forEach(btn => {
        btn.addEventListener('click', () => {
          try { abrirModalUsuario(JSON.parse(btn.dataset.editarUsr)); } catch(e) {}
        });
      });
      document.querySelectorAll('[data-materias-usr]').forEach(btn => {
        btn.addEventListener('click', () => abrirModalMaterias(btn.dataset.materiasUsr, btn.dataset.nombre));
      });
      document.querySelectorAll('[data-reset-pwd]').forEach(btn => {
        btn.addEventListener('click', () => resetearPassword(btn.dataset.resetPwd));
      });
      document.querySelectorAll('[data-toggle-usr]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const estado = btn.dataset.estado === 'true';
          if (!UI.confirm(`¿${estado ? 'Desactivar' : 'Activar'} este usuario?`)) return;
          try {
            await Api.editarUsuario(btn.dataset.toggleUsr, { estado: !estado });
            UI.toast('Estado actualizado', 'success');
            cargarUsuarios();
          } catch(e) { UI.toast(e.message, 'error'); }
        });
      });
    } catch(e) {
      document.getElementById('usuarios-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  /* ── Modal crear/editar usuario ─────────────────────────── */
  const abrirModalUsuario = async (usuario = null) => {
    const isEditar  = !!usuario;
    const esDocente = usuario?.rol === 'DOCENTE';

    document.getElementById('modal-usuario-title').textContent = isEditar ? 'Editar Usuario' : 'Nuevo Usuario';
    document.getElementById('usuario-id').value       = usuario?.id || '';
    document.getElementById('usuario-nombre').value   = usuario?.nombre || '';
    document.getElementById('usuario-apellido').value = usuario?.apellido || '';
    document.getElementById('usuario-email').value    = usuario?.email || '';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-estado').checked = usuario ? usuario.estado : true;
    document.getElementById('usuario-password-group').style.display = isEditar ? 'none' : 'block';
    UI.clearAlert('usuario-alert');

    // Poblar select de roles con labels legibles
    // DIRECTIVO no puede asignar rol ADMINISTRADOR
    const currentUser = App.getUser();
    const rolSel = document.getElementById('usuario-rol');
    rolSel.innerHTML = '<option value="">Seleccione rol...</option>' +
      _roles
        .filter(r => currentUser.rol !== 'DIRECTIVO' || r.nombre !== 'ADMINISTRADOR')
        .map(r => `<option value="${r.id}">${rolLabel(r.nombre)}</option>`).join('');
    if (usuario?.rol_id) rolSel.value = usuario.rol_id;

    // Mostrar/ocultar panel de materias según el rol seleccionado
    const rolSelect = document.getElementById('usuario-rol');
    const materiasPanel = document.getElementById('usuario-materias-panel');

    const toggleMateriasPanel = () => {
      const rolSeleccionado = _roles.find(r => r.id === rolSelect.value);
      if (rolSeleccionado?.nombre === 'DOCENTE') {
        materiasPanel.style.display = 'block';
      } else {
        materiasPanel.style.display = 'none';
      }
    };
    rolSelect.removeEventListener('change', toggleMateriasPanel);
    rolSelect.addEventListener('change', toggleMateriasPanel);

    // Cargar lista de materias disponibles con checkboxes
    const materiasLista = document.getElementById('usuario-materias-lista');
    materiasLista.innerHTML = '<div class="text-muted small">Cargando materias…</div>';

    // Mostrar el panel si ya es DOCENTE
    toggleMateriasPanel();

    if (_materias.length) {
      let materiasAsignadas = [];
      if (isEditar && esDocente) {
        try {
          const asignadas = await Api.getMateriasDocente(usuario.id);
          materiasAsignadas = asignadas.map(m => m.materia_id);
        } catch(e) {}
      }
      materiasLista.innerHTML = _materias.map(m => `
        <div class="form-check">
          <input class="form-check-input materia-check" type="checkbox"
                 id="mat-${m.id}" value="${m.id}"
                 ${materiasAsignadas.includes(m.id) ? 'checked' : ''}>
          <label class="form-check-label small" for="mat-${m.id}">
            <strong>${m.nombre}</strong>
            <span class="text-muted">${m.curso_nombre ? ' · ' + m.curso_nombre : ''}</span>
          </label>
        </div>`).join('');
    } else {
      materiasLista.innerHTML = '<p class="text-muted small mb-0">No hay materias disponibles.</p>';
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-usuario'));
    modal.show();

    document.getElementById('btn-guardar-usuario').onclick = async () => {
      const nombre   = UI.getVal('usuario-nombre');
      const apellido = UI.getVal('usuario-apellido');
      const email    = UI.getVal('usuario-email');
      const rol_id   = UI.getVal('usuario-rol');
      if (!nombre || !apellido || !email || !rol_id) {
        UI.modalAlert('usuario-alert', 'Todos los campos obligatorios deben completarse');
        return;
      }

      // Obtener materias seleccionadas
      const materia_ids = [...document.querySelectorAll('.materia-check:checked')].map(c => c.value);
      const rolSeleccionado = _roles.find(r => r.id === rol_id);

      try {
        const payload = {
          nombre, apellido, email, rol_id,
          estado: document.getElementById('usuario-estado').checked,
        };
        if (rolSeleccionado?.nombre === 'DOCENTE') {
          payload.materia_ids = materia_ids;
        }
        if (!isEditar) payload.password = UI.getVal('usuario-password');

        if (isEditar) {
          await Api.editarUsuario(document.getElementById('usuario-id').value, payload);
          UI.toast('Usuario actualizado correctamente', 'success');
        } else {
          if (!payload.password || payload.password.length < 8) {
            UI.modalAlert('usuario-alert', 'La contraseña debe tener al menos 8 caracteres');
            return;
          }
          await Api.crearUsuario(payload);
          UI.toast('Usuario creado correctamente', 'success');
        }
        modal.hide();
        cargarUsuarios();
      } catch(err) { UI.modalAlert('usuario-alert', err.message); }
    };
  };

  /* ── Modal asignar materias (acceso rápido desde tabla) ──── */
  const abrirModalMaterias = async (docenteId, nombreDocente) => {
    // Reutilizamos un modal de confirmación simple con checkboxes
    let materiasAsignadas = [];
    try {
      const asignadas = await Api.getMateriasDocente(docenteId);
      materiasAsignadas = asignadas.map(m => m.materia_id);
    } catch(e) {}

    const checkboxes = _materias.map(m => `
      <div class="form-check">
        <input class="form-check-input mat-asig-check" type="checkbox"
               id="asig-mat-${m.id}" value="${m.id}"
               ${materiasAsignadas.includes(m.id) ? 'checked' : ''}>
        <label class="form-check-label small" for="asig-mat-${m.id}">
          <strong>${m.nombre}</strong>
          ${m.curso_nombre ? `<span class="text-muted"> · ${m.curso_nombre}</span>` : ''}
        </label>
      </div>`).join('');

    // Usar el modal de usuario con un título diferente
    document.getElementById('modal-usuario-title').textContent = `Materias de ${nombreDocente}`;
    document.getElementById('usuario-id').value = docenteId;

    // Ocultar campos de usuario y mostrar solo materias
    ['usuario-nombre','usuario-apellido','usuario-email',
     'usuario-password-group','usuario-rol','usuario-estado'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.closest('.mb-3') && (el.closest('.mb-3').style.display = 'none');
    });

    const materiasPanel = document.getElementById('usuario-materias-panel');
    materiasPanel.style.display = 'block';
    document.getElementById('usuario-materias-lista').innerHTML =
      checkboxes || '<p class="text-muted small mb-0">No hay materias disponibles.</p>';

    UI.clearAlert('usuario-alert');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-usuario'));
    modal.show();

    // Al cerrar, restaurar campos ocultos
    const restoreForm = () => {
      ['usuario-nombre','usuario-apellido','usuario-email',
       'usuario-password-group','usuario-rol','usuario-estado'].forEach(id => {
        const el = document.getElementById(id);
        if (el?.closest('.mb-3')) el.closest('.mb-3').style.display = '';
      });
    };
    document.getElementById('modal-usuario').addEventListener('hidden.bs.modal', restoreForm, { once: true });

    document.getElementById('btn-guardar-usuario').onclick = async () => {
      const materia_ids = [...document.querySelectorAll('.mat-asig-check:checked')].map(c => c.value);
      try {
        await Api.asignarMaterias(docenteId, { materia_ids });
        UI.toast('Materias asignadas correctamente', 'success');
        modal.hide();
        cargarUsuarios();
      } catch(err) { UI.modalAlert('usuario-alert', err.message); }
    };
  };

  const resetearPassword = async (userId) => {
    const nuevaPass = prompt('Ingrese la nueva contraseña (mínimo 8 caracteres):');
    if (!nuevaPass) return;
    if (nuevaPass.length < 8) { UI.toast('La contraseña debe tener al menos 8 caracteres', 'warning'); return; }
    try {
      await Api.resetPassword(userId, { nueva_password: nuevaPass });
      UI.toast('Contraseña reseteada correctamente', 'success');
    } catch(e) { UI.toast(e.message, 'error'); }
  };

  const rolColor = (rol) => {
    const m = {
      DOCENTE:           'bg-primary',
      DIRECTIVO:         'bg-danger',
      ASESOR_PEDAGOGICO: 'bg-warning text-dark',
      ADMINISTRADOR:     'bg-dark',
    };
    return m[rol] || 'bg-secondary';
  };

  const rolLabel = (rol) => {
    const m = {
      DOCENTE:           'Docente',
      DIRECTIVO:         'Directivo',
      ASESOR_PEDAGOGICO: 'Asesor Pedagógico',
      ADMINISTRADOR:     'Administrador',
    };
    return m[rol] || rol.replace(/_/g, ' ');
  };

  return { render };
})();
