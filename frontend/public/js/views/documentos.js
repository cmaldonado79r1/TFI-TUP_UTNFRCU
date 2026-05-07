/* ── Vista Documentos ────────────────────────────────────── */
const DocumentosView = (() => {
  const render = async () => {
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="fade-in">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mb-0 text-primary-custom fw-bold"><i class="bi bi-folder2-open me-2"></i>Documentos</h4>
        <button class="btn btn-success" id="btn-subir-doc-btn"><i class="bi bi-upload me-1"></i>Cargar documento</button>
      </div>
      <div id="documentos-container"></div>
    </div>`;
    document.getElementById('btn-subir-doc-btn').addEventListener('click', abrirModalDocumento);
    cargarDocumentos();
  };

  const cargarDocumentos = async () => {
    UI.loader('documentos-container');
    try {
      const docs = await Api.getDocumentos();
      if (!docs.length) { UI.empty('documentos-container', 'No hay documentos cargados', 'file-earmark-x'); return; }
      document.getElementById('documentos-container').innerHTML = `
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-sgca table-hover mb-0">
              <thead><tr>
                <th>Archivo</th><th>Tipo</th><th>Materia</th><th>Subido por</th><th>Tamaño</th><th>Fecha</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                ${docs.map(d => `<tr>
                  <td>
                    <i class="bi ${iconoTipo(d.nombre_original)} me-2 text-primary"></i>
                    ${d.nombre_original || d.nombre_archivo}
                  </td>
                  <td><span class="badge bg-info text-dark">${d.tipo}</span></td>
                  <td>${d.materia_nombre}</td>
                  <td>${d.subido_por_nombre}</td>
                  <td>${formatBytes(d.tamanio_bytes)}</td>
                  <td>${UI.fecha(d.fecha_creacion)}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" data-descargar="${d.id}" data-nombre="${d.nombre_original}" title="Descargar">
                        <i class="bi bi-download"></i>
                      </button>
                      <button class="btn btn-outline-danger" data-eliminar-doc="${d.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      document.querySelectorAll('[data-descargar]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await Api.descargarDocumento(btn.dataset.descargar, btn.dataset.nombre);
          } catch(e) { UI.toast('Error al descargar: ' + e.message, 'error'); }
        });
      });

      document.querySelectorAll('[data-eliminar-doc]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!UI.confirm('¿Eliminar este documento?')) return;
          try {
            await Api.eliminarDocumento(btn.dataset.eliminarDoc);
            UI.toast('Documento eliminado', 'success');
            cargarDocumentos();
          } catch(e) { UI.toast(e.message, 'error'); }
        });
      });
    } catch(e) {
      document.getElementById('documentos-container').innerHTML =
        `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  };

  const abrirModalDocumento = async () => {
    UI.clearAlert('doc-alert');
    document.getElementById('doc-archivo').value = '';
    document.getElementById('doc-tipo').value = 'OTRO';
    try {
      const materias = await Api.getMaterias();
      UI.fillSelect('doc-materia', materias, 'id', 'materia_nombre');
    } catch(e) {}

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-documento'));
    modal.show();

    document.getElementById('btn-subir-doc').onclick = async () => {
      const materia_id = UI.getVal('doc-materia');
      const archivo    = document.getElementById('doc-archivo').files[0];
      if (!materia_id) { UI.modalAlert('doc-alert', 'Seleccione una materia'); return; }
      if (!archivo)    { UI.modalAlert('doc-alert', 'Seleccione un archivo'); return; }

      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('materia_id', materia_id);
      formData.append('tipo', UI.getVal('doc-tipo'));

      const btn = document.getElementById('btn-subir-doc');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Subiendo...';
      try {
        await Api.subirDocumento(formData);
        UI.toast('Documento cargado correctamente ✓', 'success');
        modal.hide();
        cargarDocumentos();
      } catch(err) {
        UI.modalAlert('doc-alert', err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-upload me-1"></i>Subir';
      }
    };
  };

  const iconoTipo = (nombre) => {
    if (!nombre) return 'bi-file-earmark';
    const ext = nombre.split('.').pop().toLowerCase();
    const map = { pdf: 'bi-file-earmark-pdf text-danger', doc: 'bi-file-earmark-word text-primary', docx: 'bi-file-earmark-word text-primary', xls: 'bi-file-earmark-excel text-success', xlsx: 'bi-file-earmark-excel text-success', ppt: 'bi-file-earmark-ppt text-warning', pptx: 'bi-file-earmark-ppt text-warning', jpg: 'bi-file-earmark-image text-info', png: 'bi-file-earmark-image text-info', txt: 'bi-file-earmark-text' };
    return map[ext] || 'bi-file-earmark';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return { render };
})();
