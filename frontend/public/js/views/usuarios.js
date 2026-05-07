/* ── Vista Usuarios ──────────────────────────────────────── */
const UsuariosView = (() => {
  let _roles = [];

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

    try { _roles = await Api.getRoles(); } catch(e) {}

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
                  <td><span class="badge ${rolColor(u.rol)}">${u.rol.replace('_', ' ')}</span></td>
                  <td>${u.estado
                    ? '<span class="badge bg-success">Activo</span>'
                    : '<span class="badge bg-danger">Inactivo</span>'}</td>
                  <td class="text-muted small">${UI.fechaHora(u.ultimo_acceso)}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" data-editar-usr='${JSON.stringify(u)}' title="Editar">
                        <i class="bi bi-pencil"></i>
                      </button>
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

  const abrirModalUsuario = (usuario = null) => {
    const isEditar = !!usuario;
    document.getElementById('modal-usuario-title').textContent = isEditar ? 'Editar Usuario' : 'Nuevo Usuario';
    document.getElementById('usuario-id').value       = usuario?.id || '';
    document.getElementById('usuario-nombre').value   = usuario?.nombre || '';
    document.getElementById('usuario-apellido').value = usuario?.apellido || '';
    document.getElementById('usuario-email').value    = usuario?.email || '';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-estado').checked = usuario ? usuario.estado : true;
    document.getElementById('usuario-password-group').style.display = isEditar ? 'none' : 'block';
    UI.clearAlert('usuario-alert');
    UI.fillSelect('usuario-rol', _roles, 'id', 'nombre', 'Seleccione rol...');
    if (usuario?.rol_id) document.getElementById('usuario-rol').value = usuario.rol_id;

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
      try {
        const payload = {
          nombre, apellido, email, rol_id,
          estado: document.getElementById('usuario-estado').checked,
        };
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
    const m = { DOCENTE: 'bg-primary', DIRECTIVO: 'bg-danger', ASESOR_PEDAGOGICO: 'bg-warning text-dark' };
    return m[rol] || 'bg-secondary';
  };

  return { render };
})();
