/* ============================================================
   SGCA – Aplicación Principal
   ============================================================ */

const App = (() => {
  let _user = null;
  let _currentView = null;

  // ── Navegación por rol ────────────────────────────────────
  const NAV_CONFIG = {
    DOCENTE: [
      { id: 'dashboard',    label: 'Inicio',        icon: 'speedometer2' },
      { id: 'clases',       label: 'Mis Clases',    icon: 'journal-text' },
      { id: 'evaluaciones', label: 'Evaluaciones',  icon: 'calendar-check' },
      { id: 'documentos',   label: 'Documentos',    icon: 'folder2-open' },
      { id: 'reportes',     label: 'Reportes',      icon: 'file-earmark-bar-graph' },
    ],
    DIRECTIVO: [
      { id: 'dashboard',    label: 'Inicio',        icon: 'speedometer2' },
      { id: 'aprobaciones', label: 'Bandeja',       icon: 'clipboard2-check', badge: 'pendientes' },
      { id: 'clases',       label: 'Clases',        icon: 'journal-text' },
      { id: 'cursos',       label: 'Cursos',        icon: 'building' },
      { id: 'materias',     label: 'Materias',      icon: 'book-half' },
      { id: 'evaluaciones', label: 'Evaluaciones',  icon: 'calendar-check' },
      { id: 'documentos',   label: 'Documentos',    icon: 'folder2-open' },
      { id: 'reportes',     label: 'Reportes',      icon: 'file-earmark-bar-graph' },
      { id: 'usuarios',     label: 'Usuarios',      icon: 'people' },
    ],
    ADMINISTRADOR: [
      { id: 'dashboard',    label: 'Inicio',        icon: 'speedometer2' },
      { id: 'aprobaciones', label: 'Bandeja',       icon: 'clipboard2-check', badge: 'pendientes' },
      { id: 'clases',       label: 'Clases',        icon: 'journal-text' },
      { id: 'cursos',       label: 'Cursos',        icon: 'building' },
      { id: 'materias',     label: 'Materias',      icon: 'book-half' },
      { id: 'evaluaciones', label: 'Evaluaciones',  icon: 'calendar-check' },
      { id: 'documentos',   label: 'Documentos',    icon: 'folder2-open' },
      { id: 'reportes',     label: 'Reportes',      icon: 'file-earmark-bar-graph' },
      { id: 'usuarios',     label: 'Usuarios',      icon: 'people' },
      { id: 'auditoria',    label: 'Auditoría',     icon: 'shield-check' },
    ],
    ASESOR_PEDAGOGICO: [
      { id: 'dashboard',    label: 'Inicio',        icon: 'speedometer2' },
      { id: 'aprobaciones', label: 'Bandeja',       icon: 'clipboard2-check', badge: 'pendientes' },
      { id: 'clases',       label: 'Clases',        icon: 'journal-text' },
      { id: 'evaluaciones', label: 'Evaluaciones',  icon: 'calendar-check' },
      { id: 'documentos',   label: 'Documentos',    icon: 'folder2-open' },
      { id: 'reportes',     label: 'Reportes',      icon: 'file-earmark-bar-graph' },
    ],
  };

  const VIEWS = {
    dashboard:    () => Dashboard.render(),
    clases:       () => ClasesView.render(),
    aprobaciones: () => AprobacionesView.render(),
    evaluaciones: () => EvaluacionesView.render(),
    documentos:   () => DocumentosView.render(),
    auditoria:    () => AuditoriaView.render(),
    usuarios:     () => UsuariosView.render(),
    materias:     () => MateriasView.render(),
    cursos:       () => CursosView.render(),
    reportes:     () => ReportesView.render(),
  };

  // ── Init ──────────────────────────────────────────────────
  const init = () => {
    // Toggle password en login
    document.getElementById('toggle-password')?.addEventListener('click', () => {
      const inp = document.getElementById('login-password');
      const ico = document.querySelector('#toggle-password i');
      if (inp.type === 'password') { inp.type = 'text'; ico.className = 'bi bi-eye-slash'; }
      else { inp.type = 'password'; ico.className = 'bi bi-eye'; }
    });

    // Formulario login
    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const alertEl  = document.getElementById('login-alert');
      const spinner  = document.getElementById('login-spinner');
      const btn      = document.getElementById('btn-login');

      alertEl.classList.add('d-none');
      spinner.classList.remove('d-none');
      btn.disabled = true;

      try {
        const data = await Api.login({ email, password });
        localStorage.setItem('sgca_token', data.token);
        localStorage.setItem('sgca_user', JSON.stringify(data.user));
        _user = data.user;
        mostrarApp();
      } catch(err) {
        alertEl.textContent = err.message || 'Error al iniciar sesión';
        alertEl.classList.remove('d-none');
      } finally {
        spinner.classList.add('d-none');
        btn.disabled = false;
      }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Verificar sesión existente
    const token = localStorage.getItem('sgca_token');
    const user  = localStorage.getItem('sgca_user');
    if (token && user) {
      try {
        _user = JSON.parse(user);
        mostrarApp();
        // Verificar token en servidor
        Api.me().then(u => {
          _user = { ..._user, ...u };
          localStorage.setItem('sgca_user', JSON.stringify(_user));
        }).catch(() => logout());
      } catch(e) { logout(); }
    }
  };

  const mostrarApp = () => {
    document.getElementById('screen-login').classList.add('d-none');
    document.getElementById('screen-app').classList.remove('d-none');
    renderNav();
    navigate('dashboard');
    // Actualizar badge de pendientes periódicamente
    if (['DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR'].includes(_user?.rol)) {
      actualizarBadgePendientes();
      setInterval(actualizarBadgePendientes, 60000);
    }
  };

  const renderNav = () => {
    document.getElementById('nav-user-name').textContent =
      `${_user?.nombre || ''} ${_user?.apellido || ''}`;
    const rolLabels = { DOCENTE: 'Docente', DIRECTIVO: 'Directivo', ASESOR_PEDAGOGICO: 'Asesor Pedagógico', ADMINISTRADOR: 'Administrador' };
    document.getElementById('nav-rol-badge').textContent = rolLabels[_user?.rol] || _user?.rol;

    const navLinks = document.getElementById('nav-links');
    const items = NAV_CONFIG[_user?.rol] || NAV_CONFIG.DOCENTE;
    navLinks.innerHTML = items.map(item => `
      <li class="nav-item">
        <a class="nav-link text-white-75 ${_currentView === item.id ? 'fw-bold text-white' : ''}"
           href="#" data-nav="${item.id}">
          <i class="bi bi-${item.icon} me-1"></i>${item.label}
          ${item.badge === 'pendientes' ? `<span class="badge bg-danger ms-1 d-none" id="badge-pendientes"></span>` : ''}
        </a>
      </li>`).join('');

    navLinks.querySelectorAll('[data-nav]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(a.dataset.nav);
      });
    });
  };

  const navigate = (viewId) => {
    if (!VIEWS[viewId]) return;
    _currentView = viewId;
    // Actualizar nav activo
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('fw-bold', a.dataset.nav === viewId);
      a.classList.toggle('text-white', a.dataset.nav === viewId);
    });
    // Colapsar menú móvil
    const navCollapse = document.getElementById('navMenu');
    if (navCollapse?.classList.contains('show')) {
      bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
    }
    VIEWS[viewId]();
  };

  const actualizarBadgePendientes = async () => {
    try {
      const pend = await Api.getPendientes();
      const badge = document.getElementById('badge-pendientes');
      if (badge) {
        if (pend.length > 0) {
          badge.textContent = pend.length;
          badge.classList.remove('d-none');
        } else {
          badge.classList.add('d-none');
        }
      }
    } catch(e) {}
  };

  const logout = () => {
    localStorage.removeItem('sgca_token');
    localStorage.removeItem('sgca_user');
    _user = null;
    _currentView = null;
    document.getElementById('screen-login').classList.remove('d-none');
    document.getElementById('screen-app').classList.add('d-none');
    document.getElementById('login-email').value    = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-alert').classList.add('d-none');
  };

  const getUser = () => _user;

  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', init);

  return { getUser, navigate, logout };
})();
