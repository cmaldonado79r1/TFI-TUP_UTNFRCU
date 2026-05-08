# SGCA – Sistema de Gestión de Contenido Áulico

Aplicación web que permite a los docentes registrar el contenido dictado en cada clase (temas, actividades, imprevistos, documentos, evaluaciones). Los directivos y asesores pedagógicos revisan, aprueban o rechazan esos registros; una vez aprobados se vuelven inmutables y quedan disponibles para auditoría y reportes.

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **ADMINISTRADOR** | Acceso total. Puede crear/editar cualquier usuario, asignar el rol ADMINISTRADOR, gestionar materias, cursos y toda la plataforma. |
| **DIRECTIVO** | Aprueba/rechaza registros, gestiona usuarios (excepto asignar rol ADMINISTRADOR), crea y edita materias, consulta auditoría y exporta reportes. |
| **ASESOR_PEDAGÓGICO** | Revisa contenido y emite recomendaciones; consulta auditoría y exporta reportes. |
| **DOCENTE** | Registra clases, temas, actividades por materia, imprevistos, documentos y evaluaciones. |

> **Restricción de roles**: solo el **ADMINISTRADOR** puede crear usuarios con rol ADMINISTRADOR. El Directivo ve filtrado ese rol tanto en el backend como en el frontend.

---

## Funcionalidades principales

### Docente
- Registrar clases con temas, actividades, carácter e imprevistos.
- **Vista de Actividades por Materia**: selecciona una de sus materias asignadas y carga/gestiona actividades clase por clase de forma independiente.
- Programar evaluaciones (con validación de fecha disponible).
- Cargar documentos (Programa, Planificación).
- Exportar reportes (PDF libro de temas, XLSX).

### Directivo
- Aprobar / rechazar registros de clases (los aprobados pasan a estado inmutable).
- **Crear y editar materias** (el docente asignado es opcional al crear).
- Gestionar usuarios: crear, editar, resetear contraseña, activar/desactivar.
- Asignar materias a docentes.
- Consultar auditoría completa del sistema.
- Exportar reportes.

### Administrador
- Todo lo del Directivo, más:
- Crear usuarios con rol **ADMINISTRADOR**.
- Asignar el rol ADMINISTRADOR a usuarios existentes.
- Gestión completa sin restricciones.

### Asesor Pedagógico
- Revisar y validar registros.
- Consultar auditoría.
- Exportar reportes.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, JavaScript vanilla (SPA) |
| **Backend** | Node.js 18 + Express.js (arquitectura en capas) |
| **Base de datos** | PostgreSQL 15 |
| **Autenticación** | JWT (HS256, expiración configurable) |
| **Reportes** | PDFKit (PDF), ExcelJS (XLSX) |
| **Subida de archivos** | Multer |
| **Email** | Nodemailer (configurable) |
| **Seguridad** | Rate Limiter (200 req/15 min), bcrypt para contraseñas |
| **Infraestructura** | Docker + Docker Compose |

---

## Estructura del proyecto

```
TFI-TUP_UTNFRCU/
├── backend/
│   ├── controllers/          # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── usuarios.controller.js
│   │   ├── materias.controller.js
│   │   ├── clases.controller.js
│   │   ├── actividades.controller.js
│   │   ├── evaluaciones.controller.js
│   │   ├── documentos.controller.js
│   │   ├── aprobaciones.controller.js
│   │   ├── reportes.controller.js
│   │   ├── imprevistos.controller.js
│   │   └── auditoria.controller.js
│   ├── routes/               # Definición de endpoints
│   ├── middlewares/          # verifyToken, requireDirectivo, rate limiter
│   ├── utils/                # DB helper, auditoría, generadores PDF/XLSX
│   ├── uploads/              # Archivos subidos (Multer)
│   ├── server.js
│   └── .env                  # Variables de entorno (no incluido en repo)
├── frontend/
│   └── public/
│       ├── index.html        # SPA shell + modales
│       ├── css/
│       └── js/
│           ├── app.js        # Router SPA y navegación por rol
│           ├── api.js        # Capa de llamadas HTTP
│           ├── ui.js         # Helpers UI (toast, fillSelect, etc.)
│           └── views/
│               ├── dashboard.js
│               ├── usuarios.js     # Gestión de usuarios (Directivo/Admin)
│               ├── materias.js     # Crear/editar materias (Directivo/Admin)
│               ├── clases.js       # Registro de clases (Docente)
│               ├── actividades.js  # Actividades por materia (Docente)
│               ├── evaluaciones.js
│               ├── documentos.js
│               ├── aprobaciones.js
│               ├── reportes.js
│               └── auditoria.js
├── database/
│   └── init.sql              # Schema PostgreSQL + datos iniciales
├── docker-compose.yml
└── README.md
```

---

## Instalación y ejecución

### Con Docker Compose (recomendado)

```bash
git clone https://github.com/cmaldonado79r1/TFI-TUP_UTNFRCU.git
cd TFI-TUP_UTNFRCU
docker-compose up --build
```

Acceder en: [http://localhost:3000](http://localhost:3000)

### Sin Docker (desarrollo local)

**Requisitos**: Node.js 18+, PostgreSQL 15

```bash
# 1. Crear base de datos y usuario
psql -U postgres -c "CREATE USER sgca_user WITH PASSWORD 'sgca_password';"
psql -U postgres -c "CREATE DATABASE sgca_db OWNER sgca_user;"
psql -U sgca_user -d sgca_db -f database/init.sql

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con los valores correctos

# 3. Instalar dependencias y arrancar
cd backend
npm install
node server.js
```

---

## Variables de entorno (`backend/.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgca_db
DB_USER=sgca_user
DB_PASSWORD=sgca_password
JWT_SECRET=tu_clave_secreta_aqui
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM=SGCA <noreply@sgca.edu.ar>
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## Usuarios de prueba

| Email | Rol | Contraseña |
|-------|-----|------------|
| `admin@sgca.edu.ar` | ADMINISTRADOR | `password` |
| `directivo@sgca.edu.ar` | DIRECTIVO | `password` |
| `docente@sgca.edu.ar` | DOCENTE | `password` |
| `asesor@sgca.edu.ar` | ASESOR_PEDAGÓGICO | `password` |

---

## Endpoints principales de la API

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, devuelve JWT |

### Usuarios
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/usuarios` | Directivo+ | Listar usuarios |
| POST | `/api/usuarios` | Directivo+ | Crear usuario (ADMIN solo por Admin) |
| PUT | `/api/usuarios/:id` | Directivo+ | Editar usuario |
| PUT | `/api/usuarios/:id/reset-password` | Directivo+ | Resetear contraseña |
| GET | `/api/usuarios/:id/materias` | Auth | Materias de un docente |
| PUT | `/api/usuarios/:id/materias` | Directivo+ | Asignar materias a docente |

### Materias
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/materias` | Auth | Listar materias (Docente ve solo las propias) |
| GET | `/api/materias/:id` | Auth | Obtener materia |
| POST | `/api/materias` | Directivo+ | Crear materia (docente opcional) |
| PUT | `/api/materias/:id` | Directivo+ | Editar materia |

### Clases
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/clases` | Auth | Listar clases |
| POST | `/api/clases` | Auth | Crear clase |
| PUT | `/api/clases/:id` | Auth | Editar clase |

### Actividades
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/actividades/clase/:clase_id` | Auth | Actividades de una clase |
| POST | `/api/actividades` | Auth | Crear actividad |
| DELETE | `/api/actividades/:id` | Auth | Eliminar actividad |

### Aprobaciones
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/aprobaciones/pendientes` | Directivo+ | Clases pendientes de revisión |
| POST | `/api/aprobaciones` | Directivo+ | Aprobar/rechazar clase |

### Evaluaciones
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/evaluaciones` | Auth | Listar evaluaciones |
| GET | `/api/evaluaciones/validar` | Auth | Validar disponibilidad de fecha |
| POST | `/api/evaluaciones` | Auth | Crear evaluación |
| PUT | `/api/evaluaciones/:id` | Auth | Editar evaluación |
| DELETE | `/api/evaluaciones/:id` | Auth | Eliminar evaluación |

### Documentos
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/documentos` | Auth | Listar documentos |
| POST | `/api/documentos` | Auth | Subir documento (Multer) |
| DELETE | `/api/documentos/:id` | Auth | Eliminar documento |

### Reportes
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/reportes/pdf` | Auth | Exportar libro de temas (PDF) |
| GET | `/api/reportes/excel` | Auth | Exportar reporte (XLSX) |

### Auditoría
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/auditoria` | Directivo+ | Consultar log de auditoría |

---

## Seguridad

- Todas las rutas (salvo `/api/auth/login`) requieren JWT válido (`verifyToken`).
- Las rutas administrativas requieren rol DIRECTIVO o superior (`requireDirectivo`).
- **Solo ADMINISTRADOR** puede crear o asignar el rol ADMINISTRADOR (verificado en backend y ocultado en frontend).
- Rate limiting: máximo 200 solicitudes cada 15 minutos por IP.
- Contraseñas hasheadas con bcrypt (salt rounds 12).
- Auditoría de todas las operaciones críticas (INSERT, UPDATE, DELETE) con IP de origen.
- Registros aprobados son **inmutables**: no pueden ser modificados ni eliminados.

---

## Diagrama de estados de una clase

```
CREADO → PENDIENTE → APROBADO → INMUTABLE
              ↓           
     REVISIÓN_REQUERIDA → PENDIENTE (tras corrección del docente)
```

---

## Notas de desarrollo

- El archivo `backend/.env` **no se incluye** en el repositorio por seguridad.
- `database/init.sql` contiene el schema completo con datos iniciales de prueba.
- La columna `materias.docente_id` permite `NULL` para permitir crear materias sin asignar docente todavía.
- La tabla `docente_materias` gestiona la relación N:N entre docentes y materias (una materia puede ser impartida por distintos docentes en distintos cursos).
- Los archivos subidos se almacenan en `backend/uploads/`.

---

*Proyecto académico — TFI TUP UTN FRCU · Uso académico exclusivo*
