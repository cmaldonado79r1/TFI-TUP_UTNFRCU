/* ── Vista Auditoría ─────────────────────────────────────── */
const AuditoriaView = (() => {
  let currentPage = 1;

  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-shield-check me-2"></i>Auditoría del Sistema</h4>
      </div>
      <!-- Filtros -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-end">
            <div class="col-sm-3"><label class="form-label small mb-1">Acción</label>
              <select id="aud-accion" class="form-select form-select-sm">
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="EXPORT">EXPORT</option>
              </select></div>
            <div class="col-sm-3"><label class="form-label small mb-1">Tabla</label>
              <select id="aud-tabla" class="form-select form-select-sm">
                <option value="">Todas</option>
                <option value="clases">clases</option>
                <option value="temas">temas</option>
                <option value="actividades">actividades</option>
                <option value="imprevistos">imprevistos</option>
                <option value="evaluaciones">evaluaciones</option>
                <option value="documentos">documentos</option>
                <option value="usuarios">usuarios</option>
              </select></div>
            <div class="col-sm-2"><label class="form-label small mb-1">Desde</label>
              <input type="date" id="aud-desde" class="form-control form-control-sm"/></div>
            <div class="col-sm-2"><label class="form-label small mb-1">Hasta</label>
              <input type="date" id="aud-hasta" class="form-control form-control-sm"/></div>
            <div class="col-sm-2">
              <button class="btn btn-primary btn-sm w-100" id="btn-aud-filtrar"><i class="bi bi-search me-1"></i>Filtrar</button>
            </div>
          </div>
        </div>
      </div>
      <div id="auditoria-container"></div>
      <div id="auditoria-pagination" class="mt-3 d-flex justify-content-center"></div>
    </div>`;

    document.getElementById('btn-aud-filtrar').addEventListener('click', () => {
      currentPage = 1;
      cargarAuditoria();
    });
    cargarAuditoria();
  };

  const cargarAuditoria = async () => {
    UI.loader('auditoria-container');
    try {
      const params = {
        accion:      UI.getVal('aud-accion'),
        tabla:       UI.getVal('aud-tabla'),
        fecha_desde: UI.getVal('aud-desde'),
        fecha_hasta: UI.getVal('aud-hasta'),
        page:        currentPage,
        limit:       50,
      };
      const data = await Api.getAuditoria(params);
      if (!data.data.length) {
        UI.empty('auditoria-container', 'Sin registros de auditoría', 'shield-x');
        document.getElementById('auditoria-pagination').innerHTML = '';
        return;
      }
      document.getElementById('auditoria-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header py-2 small text-muted">
            Mostrando ${data.data.length} de ${data.total} registros – Página ${data.page}/${data.pages}
          </div>
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0" style="font-size:.8rem">
              <thead><tr>
                <th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Tabla</th><th>Descripción</th><th>IP</th>
              </tr></thead>
              <tbody>
                ${data.data.map(r => `<tr>
                  <td class="text-nowrap">${UI.fechaHora(r.timestamp)}</td>
                  <td>${r.usuario_nombre || '<span class="text-muted">Sistema</span>'}<br/><small class="text-muted">${r.usuario_email || ''}</small></td>
                  <td><span class="badge ${accionColor(r.accion)}">${r.accion}</span></td>
                  <td><code class="small">${r.tabla_afectada || '—'}</code></td>
                  <td>${r.descripcion || '—'}</td>
                  <td><code class="small">${r.ip_origen || '—'}</code></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      UI.pagination('auditoria-pagination', data.page, data.pages, (p) => {
        currentPage = p;
        cargarAuditoria();
      });
    } catch(e) {
      document.getElementById('auditoria-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const accionColor = (accion) => {
    const m = { INSERT: 'bg-success', UPDATE: 'bg-warning text-dark', DELETE: 'bg-danger', LOGIN: 'bg-info text-dark', LOGOUT: 'bg-secondary', EXPORT: 'bg-primary' };
    return m[accion] || 'bg-secondary';
  };

  return { render };
})();
