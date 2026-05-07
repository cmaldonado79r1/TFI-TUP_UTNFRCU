-- ============================================================
-- SGCA - Sistema de Gestión de Contenido Áulico
-- Script de inicialización de base de datos PostgreSQL
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE estado_clase AS ENUM ('CREADO', 'PENDIENTE', 'REVISION_REQUERIDA', 'APROBADO', 'INMUTABLE');
CREATE TYPE estado_aprobacion AS ENUM ('APROBADO', 'RECHAZADO');
CREATE TYPE tipo_documento AS ENUM ('PROGRAMA', 'PLANIFICACION', 'PROYECTO', 'EVALUACION', 'OTRO');
CREATE TYPE tipo_imprevisto AS ENUM ('TECNICO', 'CLIMATICO', 'INSTITUCIONAL', 'PERSONAL', 'OTRO');
CREATE TYPE severidad_imprevisto AS ENUM ('BAJA', 'MEDIA', 'ALTA');
CREATE TYPE accion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');

-- ============================================================
-- TABLA: roles
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rol_id UUID NOT NULL REFERENCES roles(id),
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP
);

-- ============================================================
-- TABLA: cursos
-- ============================================================
CREATE TABLE cursos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    nivel INTEGER NOT NULL,
    turno VARCHAR(20) NOT NULL,
    anio_lectivo INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: materias
-- ============================================================
CREATE TABLE materias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(20),
    horas_semanales INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    curso_id UUID NOT NULL REFERENCES cursos(id),
    docente_id UUID NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: clases
-- ============================================================
CREATE TABLE clases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    materia_id UUID NOT NULL REFERENCES materias(id),
    docente_id UUID NOT NULL REFERENCES usuarios(id),
    fecha DATE NOT NULL,
    numero_clase INTEGER,
    caracter VARCHAR(50) DEFAULT 'TEÓRICA',
    estado estado_clase DEFAULT 'CREADO',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    aprobador_id UUID REFERENCES usuarios(id)
);

-- ============================================================
-- TABLA: temas
-- ============================================================
CREATE TABLE temas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: actividades
-- ============================================================
CREATE TABLE actividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'PRÁCTICA',
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: imprevistos
-- ============================================================
CREATE TABLE imprevistos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    tipo tipo_imprevisto DEFAULT 'OTRO',
    severidad severidad_imprevisto DEFAULT 'BAJA',
    resuelto BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: evaluaciones
-- ============================================================
CREATE TABLE evaluaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    materia_id UUID NOT NULL REFERENCES materias(id),
    curso_id UUID NOT NULL REFERENCES cursos(id),
    docente_id UUID NOT NULL REFERENCES usuarios(id),
    nombre VARCHAR(150),
    fecha DATE NOT NULL,
    bloqueada BOOLEAN DEFAULT FALSE,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: documentos
-- ============================================================
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    materia_id UUID NOT NULL REFERENCES materias(id),
    tipo tipo_documento DEFAULT 'OTRO',
    nombre_archivo VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255),
    ruta VARCHAR(500) NOT NULL,
    tamanio_bytes BIGINT,
    cargado_por UUID NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: aprobaciones
-- ============================================================
CREATE TABLE aprobaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES clases(id),
    aprobador_id UUID NOT NULL REFERENCES usuarios(id),
    estado estado_aprobacion NOT NULL,
    comentarios TEXT,
    fecha_revision TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA: auditoria
-- ============================================================
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    tabla_afectada VARCHAR(100),
    accion accion_auditoria NOT NULL,
    registro_id UUID,
    datos_anteriores JSONB,
    datos_despues JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_origen VARCHAR(50),
    descripcion TEXT
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_materias_docente ON materias(docente_id);
CREATE INDEX idx_materias_curso ON materias(curso_id);
CREATE INDEX idx_clases_materia ON clases(materia_id);
CREATE INDEX idx_clases_docente ON clases(docente_id);
CREATE INDEX idx_clases_estado ON clases(estado);
CREATE INDEX idx_clases_fecha ON clases(fecha);
CREATE INDEX idx_temas_clase ON temas(clase_id);
CREATE INDEX idx_actividades_clase ON actividades(clase_id);
CREATE INDEX idx_imprevistos_clase ON imprevistos(clase_id);
CREATE INDEX idx_evaluaciones_materia ON evaluaciones(materia_id);
CREATE INDEX idx_evaluaciones_fecha ON evaluaciones(fecha);
CREATE INDEX idx_aprobaciones_clase ON aprobaciones(clase_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_timestamp ON auditoria(timestamp);

-- ============================================================
-- DATOS INICIALES: Roles
-- ============================================================
INSERT INTO roles (id, nombre, descripcion, permisos) VALUES
(
    uuid_generate_v4(),
    'DOCENTE',
    'Docente de la institución. Puede registrar clases, temas, actividades, imprevistos y documentos.',
    '{"clases": ["crear","editar","ver","enviar"],"temas": ["crear","editar","ver"],"actividades": ["crear","editar","ver"],"imprevistos": ["crear","ver"],"documentos": ["cargar","ver"],"evaluaciones": ["crear","ver"],"reportes": ["exportar"]}'::jsonb
),
(
    uuid_generate_v4(),
    'DIRECTIVO',
    'Directivo institucional. Puede aprobar/rechazar clases, bloquear fechas y ver auditoría.',
    '{"clases": ["ver","aprobar","rechazar"],"aprobaciones": ["crear","ver"],"evaluaciones": ["crear","ver","bloquear"],"auditoria": ["ver"],"reportes": ["ver","exportar"],"usuarios": ["ver","gestionar"]}'::jsonb
),
(
    uuid_generate_v4(),
    'ASESOR_PEDAGOGICO',
    'Asesor pedagógico. Puede revisar contenido y emitir recomendaciones.',
    '{"clases": ["ver","aprobar","rechazar"],"aprobaciones": ["crear","ver"],"evaluaciones": ["ver"],"reportes": ["ver","exportar"]}'::jsonb
);

-- ============================================================
-- DATOS INICIALES: Usuario Admin/Directivo de prueba
-- ============================================================
-- Password: Admin1234! (bcrypt hash)
-- Contraseña de todos los usuarios de prueba: password
-- Hash bcrypt generado con bcrypt.hash('password', 10)
INSERT INTO usuarios (id, email, password_hash, nombre, apellido, rol_id, estado) VALUES
(
    uuid_generate_v4(),
    'admin@sgca.edu.ar',
    '$2b$10$hoieJG9am9Me6M/1pOz0QOcz.kwPaH5qJmBcec0L103RMIO0PSeSS',
    'Admin',
    'Sistema',
    (SELECT id FROM roles WHERE nombre = 'DIRECTIVO'),
    TRUE
),
(
    uuid_generate_v4(),
    'directivo@sgca.edu.ar',
    '$2b$10$hoieJG9am9Me6M/1pOz0QOcz.kwPaH5qJmBcec0L103RMIO0PSeSS',
    'María',
    'González',
    (SELECT id FROM roles WHERE nombre = 'DIRECTIVO'),
    TRUE
),
(
    uuid_generate_v4(),
    'docente@sgca.edu.ar',
    '$2b$10$hoieJG9am9Me6M/1pOz0QOcz.kwPaH5qJmBcec0L103RMIO0PSeSS',
    'Juan',
    'Pérez',
    (SELECT id FROM roles WHERE nombre = 'DOCENTE'),
    TRUE
),
(
    uuid_generate_v4(),
    'asesor@sgca.edu.ar',
    '$2b$10$hoieJG9am9Me6M/1pOz0QOcz.kwPaH5qJmBcec0L103RMIO0PSeSS',
    'Carlos',
    'López',
    (SELECT id FROM roles WHERE nombre = 'ASESOR_PEDAGOGICO'),
    TRUE
);

-- ============================================================
-- DATOS INICIALES: Cursos de prueba
-- ============================================================
INSERT INTO cursos (id, nombre, nivel, turno, anio_lectivo, activo) VALUES
(uuid_generate_v4(), '1° Año A', 1, 'MAÑANA', 2025, TRUE),
(uuid_generate_v4(), '1° Año B', 1, 'TARDE', 2025, TRUE),
(uuid_generate_v4(), '2° Año A', 2, 'MAÑANA', 2025, TRUE),
(uuid_generate_v4(), '3° Año A', 3, 'MAÑANA', 2025, TRUE);

-- ============================================================
-- DATOS INICIALES: Materias de prueba
-- ============================================================
INSERT INTO materias (nombre, codigo, horas_semanales, activa, curso_id, docente_id)
SELECT 'Matemática', 'MAT01', 4, TRUE, c.id, u.id
FROM cursos c, usuarios u
WHERE c.nombre = '1° Año A' AND u.email = 'docente@sgca.edu.ar';

INSERT INTO materias (nombre, codigo, horas_semanales, activa, curso_id, docente_id)
SELECT 'Lengua y Literatura', 'LEN01', 4, TRUE, c.id, u.id
FROM cursos c, usuarios u
WHERE c.nombre = '1° Año A' AND u.email = 'docente@sgca.edu.ar';

INSERT INTO materias (nombre, codigo, horas_semanales, activa, curso_id, docente_id)
SELECT 'Historia', 'HIS01', 3, TRUE, c.id, u.id
FROM cursos c, usuarios u
WHERE c.nombre = '2° Año A' AND u.email = 'docente@sgca.edu.ar';

-- ============================================================
-- FUNCIÓN: Actualizar fecha_actualizacion en clases
-- ============================================================
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clases_actualizacion
    BEFORE UPDATE ON clases
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

-- ============================================================
-- VISTA: Clases con información completa
-- ============================================================
CREATE VIEW vista_clases_completas AS
SELECT
    c.id,
    c.fecha,
    c.numero_clase,
    c.caracter,
    c.estado,
    c.observaciones,
    c.fecha_creacion,
    c.fecha_actualizacion,
    m.nombre AS materia_nombre,
    m.codigo AS materia_codigo,
    cu.nombre AS curso_nombre,
    cu.turno AS curso_turno,
    u.nombre || ' ' || u.apellido AS docente_nombre,
    u.email AS docente_email,
    ap.nombre || ' ' || ap.apellido AS aprobador_nombre,
    (SELECT COUNT(*) FROM temas t WHERE t.clase_id = c.id) AS total_temas,
    (SELECT COUNT(*) FROM actividades a WHERE a.clase_id = c.id) AS total_actividades,
    (SELECT COUNT(*) FROM imprevistos i WHERE i.clase_id = c.id) AS total_imprevistos
FROM clases c
JOIN materias m ON c.materia_id = m.id
JOIN cursos cu ON m.curso_id = cu.id
JOIN usuarios u ON c.docente_id = u.id
LEFT JOIN usuarios ap ON c.aprobador_id = ap.id;
