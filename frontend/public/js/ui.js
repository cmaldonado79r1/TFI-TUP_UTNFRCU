/* ============================================================
   SGCA – UI Helpers
   ============================================================ */

const UI = (() => {

  // ── Toast ─────────────────────────────────────────────────
  const toast = (msg, type = 'success') => {
    const el  = document.getElementById('app-toast');
    const txt = document.getElementById('toast-message');
    el.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : type === 'warning' ? 'warning text-dark' : 'success'}`;
    txt.textContent = msg;
    const t = bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 });
    t.show();
  };

  // ── Loader ────────────────────────────────────────────────
  const loader = (containerId) => {
    document.getElementById(containerId).innerHTML =
      `<div class="sgca-loader"><div class="spinner-border"></div></div>`;
  };

  // ── Empty state ───────────────────────────────────────────
  const empty = (containerId, msg = 'Sin resultados', icon = 'inbox') => {
    document.getElementById(containerId).innerHTML =
      `<div class="empty-state"><i class="bi bi-${icon}"></i><p>${msg}</p></div>`;
  };

  // ── Badge estado ──────────────────────────────────────────
  const estadoBadge = (estado) => {
    const labels = {
      CREADO:              'Creado',
      PENDIENTE:           'Pendiente',
      REVISION_REQUERIDA:  'Revisión requerida',
      APROBADO:            'Aprobado',
      INMUTABLE:           'Aprobado ✓',
    };
    return `<span class="badge-estado estado-${estado}">${labels[estado] || estado}</span>`;
  };

  // ── Fecha legible ─────────────────────────────────────────
  const fecha = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fechaHora = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ── Confirm dialog ────────────────────────────────────────
  const confirm = (msg) => window.confirm(msg);

  // ── Set form values ───────────────────────────────────────
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val !== undefined && val !== null ? val : '';
  };

  // ── Get form values ───────────────────────────────────────
  const getVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return el.value.trim();
  };

  // ── Populate select ───────────────────────────────────────
  const fillSelect = (id, items, valueKey, labelKey, placeholder = 'Seleccione...') => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(i => `<option value="${i[valueKey]}">${i[labelKey]}</option>`).join('');
  };

  // ── Alert dentro de modal ─────────────────────────────────
  const modalAlert = (id, msg, type = 'danger') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 5000);
  };

  const clearAlert = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  };

  // ── Severity icon ─────────────────────────────────────────
  const sevIcon = (sev) => {
    const m = { BAJA: '🟢', MEDIA: '🟡', ALTA: '🔴' };
    return m[sev] || '⚪';
  };

  // ── Tipo imprevisto label ─────────────────────────────────
  const tipoLabel = (tipo) => {
    const m = { TECNICO:'Técnico', CLIMATICO:'Climático', INSTITUCIONAL:'Institucional', PERSONAL:'Personal', OTRO:'Otro' };
    return m[tipo] || tipo;
  };

  // ── Paginación ────────────────────────────────────────────
  const pagination = (containerId, currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) { document.getElementById(containerId).innerHTML = ''; return; }
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    document.getElementById(containerId).innerHTML = `
      <nav><ul class="pagination pagination-sm mb-0">
        <li class="page-item ${currentPage===1?'disabled':''}">
          <a class="page-link" href="#" data-page="${currentPage-1}">‹</a>
        </li>
        ${pages.map(p => `
          <li class="page-item ${p===currentPage?'active':''}">
            <a class="page-link" href="#" data-page="${p}">${p}</a>
          </li>`).join('')}
        <li class="page-item ${currentPage===totalPages?'disabled':''}">
          <a class="page-link" href="#" data-page="${currentPage+1}">›</a>
        </li>
      </ul></nav>`;
    document.getElementById(containerId).querySelectorAll('[data-page]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const p = parseInt(a.dataset.page);
        if (p >= 1 && p <= totalPages && p !== currentPage) onPageChange(p);
      });
    });
  };

  return { toast, loader, empty, estadoBadge, fecha, fechaHora, confirm, setVal, getVal, fillSelect, modalAlert, clearAlert, sevIcon, tipoLabel, pagination };
})();
