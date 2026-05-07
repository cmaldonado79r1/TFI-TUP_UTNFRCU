/* ── Dashboard ───────────────────────────────────────────── */
const Dashboard = (() => {
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-speedometer2 me-2"></i>Panel Principal</h4>
        <small class="text-muted">${new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</small>
      </div>
      <div class="row g-3 mb-4" id="stats-cards">
        <div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div>
      </div>
      <div class="row g-3">
        <div class="col-lg-6"><div class="card shadow-sm"><div class="card-header fw-semibold"><i class="bi bi-clock-history me-2"></i>Últimas clases</div><div class="card-body p-0" id="dash-ultimas-clases"><div class="p-3 text-center"><div class="spinner-border spinner-border-sm"></div></div></div></div></div>
        <div class="col-lg-6"><div class="card shadow-sm"><div class="card-header fw-semibold"><i class="bi bi-hourglass-split me-2 text-warning"></i>Pendientes de revisión</div><div class="card-body p-0" id="dash-pendientes"><div class="p-3 text-center"><div class="spinner-border spinner-border-sm"></div></div></div></div></div>
      </div>
    </div>`;

    try {
      const [stats, clases] = await Promise.all([
        Api.estadisticasClases(),
        Api.getClases({ limit: 5 })
      ]);
      renderStats(stats);
      renderUltimasClases(clases);

      const user = App.getUser();
      if (['DIRECTIVO', 'ASESOR_PEDAGOGICO'].includes(user.rol)) {
        const pendientes = await Api.getPendientes();
        renderPendientes(pendientes);
      } else {
        document.getElementById('dash-pendientes').innerHTML =
          `<div class="empty-state"><i class="bi bi-check-circle text-success"></i><p class="small">Solo disponible para directivos</p></div>`;
      }
    } catch (e) {
      UI.toast('Error al cargar el dashboard: ' + e.message, 'error');
    }
  };

  const renderStats = (s) => {
    document.getElementById('stats-cards').innerHTML = `
      <div class="col-6 col-md-3"><div class="card stat-card text-white" style="background:var(--sgca-primary-lt)">
        <div class="card-body text-center py-3">
          <div class="display-6">${s.total}</div>
          <div class="small fw-semibold opacity-90">Total clases</div>
        </div>
      </div></div>
      <div class="col-6 col-md-3"><div class="card stat-card" style="background:#fff3cd">
        <div class="card-body text-center py-3">
          <div class="display-6 text-warning">${s.pendientes}</div>
          <div class="small fw-semibold text-warning-emphasis">Pendientes</div>
        </div>
      </div></div>
      <div class="col-6 col-md-3"><div class="card stat-card" style="background:#d1e7dd">
        <div class="card-body text-center py-3">
          <div class="display-6 text-success">${s.aprobadas}</div>
          <div class="small fw-semibold text-success">Aprobadas</div>
        </div>
      </div></div>
      <div class="col-6 col-md-3"><div class="card stat-card" style="background:#f8d7da">
        <div class="card-body text-center py-3">
          <div class="display-6 text-danger">${s.revision}</div>
          <div class="small fw-semibold text-danger">En revisión</div>
        </div>
      </div></div>`;
  };

  const renderUltimasClases = (clases) => {
    const el = document.getElementById('dash-ultimas-clases');
    if (!clases.length) { el.innerHTML = `<div class="empty-state"><i class="bi bi-journal-x"></i><p>No hay clases registradas</p></div>`; return; }
    el.innerHTML = `<ul class="list-group list-group-flush">` +
      clases.slice(0, 5).map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
          <div>
            <div class="fw-semibold small">${c.materia_nombre}</div>
            <div class="text-muted" style="font-size:.78rem">${c.curso_nombre} · ${UI.fecha(c.fecha)}</div>
          </div>
          ${UI.estadoBadge(c.estado)}
        </li>`).join('') + `</ul>`;
  };

  const renderPendientes = (pend) => {
    const el = document.getElementById('dash-pendientes');
    if (!pend.length) { el.innerHTML = `<div class="empty-state"><i class="bi bi-check2-all text-success"></i><p>Sin pendientes 🎉</p></div>`; return; }
    el.innerHTML = `<ul class="list-group list-group-flush">` +
      pend.slice(0, 5).map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
          <div>
            <div class="fw-semibold small">${c.materia_nombre}</div>
            <div class="text-muted" style="font-size:.78rem">${c.docente_nombre} · ${UI.fecha(c.fecha)}</div>
          </div>
          <button class="btn btn-sm btn-outline-primary" onclick="App.navigate('aprobaciones')">
            <i class="bi bi-eye"></i>
          </button>
        </li>`).join('') + `</ul>`;
  };

  return { render };
})();
