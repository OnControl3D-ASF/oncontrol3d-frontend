# OnControl - Sistema de Gestión Oncológica v2.0

OnControl es una plataforma integral de gestión médica diseñada específicamente para la atención oncológica. Facilita la colaboración entre organizaciones de salud, médicos y pacientes, permitiendo un seguimiento exhaustivo de tratamientos, síntomas y citas médicas.

## 🌟 Características Principales

### 🏢 Gestión de Organizaciones
- **Panel de Control**: Estadísticas globales de la institución.
- **Gestión de Médicos**: Registro y supervisión de profesionales de la salud.
- **Métricas de Rendimiento**: Seguimiento de pacientes activos y citas programadas.

### 👨‍⚕️ Panel Médico
- **Dashboard Personalizado**: Vista general de pacientes asignados y próximas citas.
- **Gestión de Pacientes**: Registro, historial médico y seguimiento de evolución.
- **Tratamientos**: Creación y supervisión de protocolos (Quimioterapia, Radioterapia, etc.).
- **Reportes Avanzados**: Análisis de adherencia, efectividad y estadísticas mensuales.

### 👩‍🦱 Panel Paciente
- **Control de Síntomas**: Registro diario de severidad, duración e impacto.
- **Plan de Medicación**: Calendario de tomas y registro de adherencia.
- **Mi Tratamiento**: Información detallada sobre el protocolo actual y sesiones.
- **Agenda Médica**: Gestión de citas y recordatorios.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [Next.js 15.1](https://nextjs.org/) (App Router, TypeScript)
- **Backend API**: [Spring Boot v3.4.1](https://spring.io/projects/spring-boot) (Java 17)
- **Base de Datos**: PostgreSQL
- **Estilos**: Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
- **Iconos**: Lucide React
- **Estado Global**: React Context API & Hooks personalizados

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── auth/                    # Flujos de login y registro
│   └── dashboard/
│       ├── organizacion/        # Panel administrativo institucional
│       ├── medico/              # Herramientas para oncólogos
│       └── paciente/            # Interfaz para el paciente
├── components/
│   ├── ui/                      # Componentes base (shadcn/ui)
│   ├── forms/                   # Formularios especializados
│   └── layout/                  # Componentes de navegación y estructura
├── hooks/                       # Lógica de negocio reutilizable (API calls)
├── lib/
│   └── api.ts                   # Cliente API centralizado
├── contexts/                    # Manejo de estado de autenticación
└── types/                       # Definiciones de TypeScript para la API
```

## 🔐 Credenciales de Acceso (Demo)

### Organización (Administrador)
- **Email**: `admin@hospital.com`
- **Contraseña**: `password123` 

### Médicos
- **Doctor 1**: `dr.garcia@hospital.com`
- **Doctor 2**: `dr.rodriguez@hospital.com`
- **Contraseña**: `password123` 


### Pacientes
- **Paciente 1**: `juan.perez@email.com`
- **Paciente 2**: `ana.martinez@email.com`
- **Paciente 3**: `pedro.lopez@email.com`
- **Paciente 4**: `laura.sanchez@email.com`
- **Contraseña**: `password123` 


## 🚀 Configuración del Proyecto

### Requisitos
- Node.js 18.x o superior
- npm / yarn / pnpm

### Variables de Env (Vercel / Local)
Asegúrate de configurar la URL del backend:
```env
NEXT_PUBLIC_API_URL=https://oncontrol-backend-api.onrender.com
```

#### Servicio de autenticación (desarrollo)

El login vive en el auth-service. En `npm run dev`, `/api/auth/*` se proxea a `AUTH_ORIGIN`
(por defecto `BACKEND_ORIGIN`, es decir `http://localhost:8081`, sin cambios de comportamiento).
Para usar el auth-service local, definí en `.env.local`:
```env
AUTH_ORIGIN=http://localhost:8082
```
Para volver al login del backend clinico, quitá `AUTH_ORIGIN`. El flujo es
`POST /api/auth/login` -> `GET /api/me` (Bearer) -> sesión `{...me, token}`; el registro de
organizaciones usa `POST /api/organizations` y luego login. Una respuesta 401 en un endpoint
autenticado cierra la sesión y redirige a `/auth/login`. `/internal` nunca se proxea.

### Instalación Local
```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev
```

### Vista sólida de pulmones (demo local)

En **Tomografía 3D → Generar reconstrucción pulmonar 3D**, la vista inicial muestra
la superficie de la máscara segmentada: arrastrá para rotar, usá la rueda para
acercar y **Restablecer vista** para volver al encuadre frontal. No representa
tejido interno ni detecta tumores; es una visualización referencial, no diagnóstica.
**Volumen en VolView** conserva el visor volumétrico como alternativa.

El servicio de imágenes debe incluir `GET /studies/{id}/derived/lung-surface` y
conservar el DICOM original del estudio. La primera generación puede tardar un
minuto. En desarrollo se usa el proxy `/imaging`; en producción configurá
`NEXT_PUBLIC_IMAGING_URL` con el origen HTTPS público del servicio (sin `/studies`).
Si no está configurado, se utiliza el origen de `lungVolumeUrl` devuelto por la API.
El visor requiere WebGL y carga Three.js solo al abrir el modelo.

Pruebas del visor, sin build:
```bash
node --test src/components/medical-imaging/lung-surface.test.mjs
npx tsc --noEmit --incremental false
```

## 🌐 Despliegue Actual
- **Frontend**: [Vercel](https://oncontrol-front-sem.vercel.app)
- **Backend**: [Render](https://oncontrol-backend-api.onrender.com)

---
**OnControl** - *Tecnología al servicio de la vida.*
