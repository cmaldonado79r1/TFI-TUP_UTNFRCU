/* ── Vista Reportes ──────────────────────────────────────── */
const ReportesView = (() => {
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <h4 class="mb-4 text-primary-custom fw-bold"><i class="bi bi-file-earmark-bar-graph me-2"></i>Exportar Reportes</h4>
      <div class="row g-4">

        <!-- PDF Libro de Temas -->
        <div class="col-md-6">
          <div class="card shadow-sm h-100 border-danger border-opacity-25">
            <div class="card-header bg-danger bg-opacity-10">
              <h6 class="mb-0 fw-bold text-danger"><i class="bi bi-file-earmark-pdf me-2"></i>Libro de Temas (PDF)</h6>
            </div>
            <div class="card-body">
              <p class="text-muted small">Genera un PDF con todos los temas y actividades de una materia. Incluye historial de clases, observaciones e imprevistos.</p>
              <div class="mb-3">
                <label class="form-label fw-semibold">Materia *</label>
                <select id="pdf-materia" class="form-select"></select>
              </div>
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label fw-semibold">Desde (opcional)</label>
                  <input type="date" id="pdf-desde" class="form-control"/>
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold">Hasta (opcional)</label>
                  <input type="date" id="pdf-hasta" class="form-control"/>
                </div>
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <button class="btn btn-danger w-100" id="btn-export-pdf">
                <span id="pdf-spinner" class="spinner-border spinner-border-sm d-none me-1"></span>
                <i class="bi bi-file-earmark-pdf me-1"></i>Descargar PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Excel Reporte de Clases -->
        <div class="col-md-6">
          <div class="card shadow-sm h-100 border-success border-opacity-25">
            <div class="card-header bg-success bg-opacity-10">
              <h6 class="mb-0 fw-bold text-success"><i class="bi bi-file-earmark-excel me-2"></i>Reporte de Clases (Excel)</h6>
            </div>
            <div class="card-body">
              <p class="text-muted small">Genera un archivo Excel con el listado completo de clases, estados, aprobaciones y estadísticas por materia.</p>
              <div class="mb-3">
                <label class="form-label fw-semibold">Materia (opcional)</label>
                <select id="xls-materia" class="form-select"></select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Estado (opcional)</label>
                <select id="xls-estado" class="form-select">
                  <option value="">Todos los estados</option>
                  <option value="CREADO">Creado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="REVISION_REQUERIDA">Revisión requerida</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="INMUTABLE">Inmutable</option>
                </select>
              </div>
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label fw-semibold">Desde (opcional)</label>
                  <input type="date" id="xls-desde" class="form-control"/>
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold">Hasta (opcional)</label>
                  <input type="date" id="xls-hasta" class="form-control"/>
                </div>
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <button class="btn btn-success w-100" id="btn-export-xls">
                <span id="xls-spinner" class="spinner-border spinner-border-sm d-none me-1"></span>
                <i class="bi bi-file-earmark-excel me-1"></i>Descargar Excel
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>`;

    try {
      const materias = await Api.getMaterias();
      UI.fillSelect('pdf-materia', materias, 'id', 'materia_nombre', '-- Seleccione materia --');
      UI.fillSelect('xls-materia', materias, 'id', 'materia_nombre', '-- Todas las materias --');
    } catch(e) {}

    document.getElementById('btn-export-pdf').addEventListener('click', async () => {
      const materia_id = UI.getVal('pdf-materia');
      if (!materia_id) { UI.toast('Seleccione una materia', 'warning'); return; }
      const spinner = document.getElementById('pdf-spinner');
      const btn = document.getElementById('btn-export-pdf');
      spinner.classList.remove('d-none');
      btn.disabled = true;
      try {
        await Api.exportarPDF({
          materia_id,
          fecha_desde: UI.getVal('pdf-desde'),
          fecha_hasta: UI.getVal('pdf-hasta'),
        });
        UI.toast('PDF generado y descargado correctamente', 'success');
      } catch(e) { UI.toast('Error al generar PDF: ' + e.message, 'error'); }
      finally { spinner.classList.add('d-none'); btn.disabled = false; }
    });

    document.getElementById('btn-export-xls').addEventListener('click', async () => {
      const spinner = document.getElementById('xls-spinner');
      const btn = document.getElementById('btn-export-xls');
      spinner.classList.remove('d-none');
      btn.disabled = true;
      try {
        await Api.exportarExcel({
          materia_id:  UI.getVal('xls-materia'),
          estado:      UI.getVal('xls-estado'),
          fecha_desde: UI.getVal('xls-desde'),
          fecha_hasta: UI.getVal('xls-hasta'),
        });
        UI.toast('Excel generado y descargado correctamente', 'success');
      } catch(e) { UI.toast('Error al generar Excel: ' + e.message, 'error'); }
      finally { spinner.classList.add('d-none'); btn.disabled = false; }
    });
  };

  return { render };
})();
