# SGCA – Sistema de Gestión de Contenido Áulico

**Trabajo Final Integrador – Técnico Universitario en Programación**  
**UTN Facultad Regional Concepcion del Uruguay**

---

## Descripción

El SGCA es una aplicación web que permite a los docentes registrar el contenido de sus clases (temas, actividades, imprevistos), programar evaluaciones y cargar documentos. Los directivos y asesores pedagógicos revisan, aprueban o rechazan dichos registros. Una vez aprobado, el registro queda inmutable y disponible para consultas, reportes y auditoría.

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Docente** | Registra clases, temas, actividades, imprevistos, documentos y evaluaciones |
| **Directivo** | Aprueba o rechaza registros, bloquea fechas, gestiona usuarios, consulta auditoría |
| **Asesor Pedagógico** | Revisa contenido y emite recomendaciones |

---

## Stack tecnológico

- **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript (SPA vanilla)
- **Backend:** Node.js + Express.js (arquitectura por capas: routes → controllers → services)
- **Base de datos:** PostgreSQL 15
- **Autenticación:** JWT (jsonwebtoken + bcrypt)
- **Email:** Nodemailer (simulado en desarrollo)
- **Reportes:** PDFKit (PDF) + ExcelJS (XLSX)
- **Subida de archivos:** Multer
- **Infraestructura:** Docker + Docker Compose

---

## Ciclo de vida de una clase

```
CREADO → PENDIENTE → APROBADO → INMUTABLE
                  ↘ REVISIÓN_REQUERIDA → PENDIENTE (reenvío)
```

---

## Estructura del proyecto

```
sgca/
├── backend/
│   ├── controllers/        # Lógica de negocio por recurso
│   ├── routes/             # Definición de endpoints REST
│   ├── middlewares/        # Autenticación JWT + auditoría
│   ├── models/             # Pool de conexión PostgreSQL
│   ├── utils/              # Email (Nodemailer)
│   ├── uploads/            # Archivos subidos por usuarios
│   ├── server.js           # Punto de entrada Express
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html      # SPA principal
│       ├── css/app.css
│       └── js/
│           ├── api.js      # Cliente HTTP centralizado
│           ├── ui.js       # Helpers de interfaz
│           ├── app.js      # Router y autenticación
│           └── views/      # Vistas por módulo
├── database/
│   └── init.sql            # Schema + datos iniciales
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

La aplicación estará disponible en: **http://localhost:3000**

---

### Sin Docker (desarrollo local)

**Requisitos:** Node.js 18+, PostgreSQL 15

```bash
# 1. Crear base de datos
createdb sgca_db
createuser sgca_user
psql -d sgca_db -f database/init.sql

# 2. Configurar backend
cd backend
cp .env.example .env
# Editar .env con tus datos de conexión

# 3. Instalar dependencias y levantar
npm install
node server.js
```

---

## Usuarios de prueba

| Email | Rol | Contraseña |
|-------|-----|------------|
| `directivo@sgca.edu.ar` | Directivo | `password` |
| `admin@sgca.edu.ar` | Directivo | `password` |
| `docente@sgca.edu.ar` | Docente | `password` |
| `asesor@sgca.edu.ar` | Asesor Pedagógico | `password` |

> ⚠️ Cambiar las contraseñas en un entorno de producción.

---

## API REST – Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Autenticación, devuelve JWT |
| GET | `/api/clases` | Listar clases (filtrable) |
| POST | `/api/clases` | Crear clase con temas y actividades |
| PUT | `/api/clases/:id` | Editar clase en revisión |
| GET | `/api/aprobaciones/pendientes` | Bandeja de pendientes |
| POST | `/api/aprobaciones` | Aprobar o rechazar clase |
| GET | `/api/evaluaciones/validar` | Validar disponibilidad de fecha |
| POST | `/api/imprevistos` | Registrar imprevisto en clase |
| POST | `/api/documentos` | Subir documento a una materia |
| GET | `/api/reportes/pdf` | Exportar Libro de Temas (PDF) |
| GET | `/api/reportes/excel` | Exportar reporte de clases (XLSX) |
| GET | `/api/auditoria` | Consultar log de auditoría |

---

## Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y completar:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgca_db
DB_USER=sgca_user
DB_PASSWORD=tu_password
JWT_SECRET=clave_secreta_larga
JWT_EXPIRES_IN=8h
PORT=3000
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_correo@gmail.com
MAIL_PASS=tu_app_password
```

---

## Licencia

Proyecto académico – UTN FRCU © 2025
