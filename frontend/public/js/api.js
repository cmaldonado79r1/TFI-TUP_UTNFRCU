/* ============================================================
   SGCA – API Client
   Todas las llamadas al backend van por aquí
   ============================================================ */

const API_BASE = '/api';

const Api = (() => {
  const getToken = () => localStorage.getItem('sgca_token');

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...extra
  });

  const handleResponse = async (res) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  };

  const get = (path, params = {}) => {
    const url = new URL(API_BASE + path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    return fetch(url, { headers: headers() }).then(handleResponse);
  };

  const post = (path, body) =>
    fetch(API_BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handleResponse);

  const put = (path, body) =>
    fetch(API_BASE + path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handleResponse);

  const patch = (path, body = {}) =>
    fetch(API_BASE + path, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(handleResponse);

  const del = (path) =>
    fetch(API_BASE + path, { method: 'DELETE', headers: headers() }).then(handleResponse);

  const upload = (path, formData) =>
    fetch(API_BASE + path, {
      method: 'POST',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: formData
    }).then(handleResponse);

  const download = async (path, params = {}, filename = 'descarga') => {
    const url = new URL(API_BASE + path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`Error al descargar (HTTP ${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return {
    // Auth
    login:           (body)         => post('/auth/login', body),
    me:              ()             => get('/auth/me'),
    cambiarPassword: (body)         => put('/auth/cambiar-password', body),

    // Usuarios
    getUsuarios:     (p = {})       => get('/usuarios', p),
    getUsuario:      (id)           => get(`/usuarios/${id}`),
    crearUsuario:    (body)         => post('/usuarios', body),
    editarUsuario:   (id, body)     => put(`/usuarios/${id}`, body),
    resetPassword:   (id, body)     => put(`/usuarios/${id}/reset-password`, body),
    getRoles:        ()             => get('/usuarios/roles'),

    // Cursos
    getCursos:       ()             => get('/cursos'),
    crearCurso:      (body)         => post('/cursos', body),
    editarCurso:     (id, body)     => put(`/cursos/${id}`, body),

    // Materias
    getMaterias:     (p = {})       => get('/materias', p),
    getMateria:      (id)           => get(`/materias/${id}`),
    crearMateria:    (body)         => post('/materias', body),
    editarMateria:   (id, body)     => put(`/materias/${id}`, body),

    // Clases
    getClases:       (p = {})       => get('/clases', p),
    getClase:        (id)           => get(`/clases/${id}`),
    crearClase:      (body)         => post('/clases', body),
    editarClase:     (id, body)     => put(`/clases/${id}`, body),
    estadisticasClases: ()          => get('/clases/estadisticas'),

    // Temas
    getTemas:        (clase_id)     => get(`/temas/clase/${clase_id}`),
    crearTema:       (body)         => post('/temas', body),
    eliminarTema:    (id)           => del(`/temas/${id}`),

    // Actividades
    getActividades:  (clase_id)     => get(`/actividades/clase/${clase_id}`),
    crearActividad:  (body)         => post('/actividades', body),
    eliminarActividad: (id)         => del(`/actividades/${id}`),

    // Imprevistos
    getImprevistos:  (clase_id)     => get(`/imprevistos/clase/${clase_id}`),
    crearImprevisto: (body)         => post('/imprevistos', body),
    resolverImprevisto: (id)        => patch(`/imprevistos/${id}/resolver`),
    eliminarImprevisto: (id)        => del(`/imprevistos/${id}`),

    // Evaluaciones
    getEvaluaciones: (p = {})       => get('/evaluaciones', p),
    validarFecha:    (p)            => get('/evaluaciones/validar', p),
    crearEvaluacion: (body)         => post('/evaluaciones', body),
    editarEvaluacion:(id, body)     => put(`/evaluaciones/${id}`, body),
    eliminarEvaluacion: (id)        => del(`/evaluaciones/${id}`),

    // Documentos
    getDocumentos:   (p = {})       => get('/documentos', p),
    subirDocumento:  (formData)     => upload('/documentos', formData),
    eliminarDocumento: (id)         => del(`/documentos/${id}`),
    descargarDocumento: (id, name)  => download(`/documentos/${id}/descargar`, {}, name),

    // Aprobaciones
    getPendientes:   ()             => get('/aprobaciones/pendientes'),
    aprobar:         (body)         => post('/aprobaciones', body),
    getHistorialAprobaciones: (clase_id) => get(`/aprobaciones/historial/${clase_id}`),

    // Auditoría
    getAuditoria:    (p = {})       => get('/auditoria', p),

    // Reportes
    exportarPDF:     (p = {})       => download('/reportes/pdf', p, 'libro_temas.pdf'),
    exportarExcel:   (p = {})       => download('/reportes/excel', p, 'reporte_clases.xlsx'),
  };
})();
