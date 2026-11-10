# Chat Flow

Aplicación web de chat en tiempo real. Los usuarios se registran, crean conversaciones directas o grupales con otros usuarios y se envían mensajes instantáneamente mediante WebSockets.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS v4, socket.io-client |
| Backend | NestJS, TypeORM, Socket.IO, JWT, bcrypt |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker, Docker Compose |

## Estructura del proyecto

```
chat-flow/
├── backend/          API REST y gateway de WebSockets (NestJS)
├── frontend/         Interfaz web (Next.js)
├── docker-compose.yml
├── .env.example      Variables para Docker Compose
└── README.md
```

## Requisitos

- Node.js 22 o superior (para ejecución local)
- Docker Desktop (para ejecución con Docker o para la base de datos)
- Git

## Variables de entorno

Cada parte tiene su archivo de ejemplo:

| Archivo | Para qué sirve | Cómo crearlo |
|---|---|---|
| `.env.example` (raíz) | Docker Compose | Copiar a `.env` y definir `JWT_SECRET` |
| `backend/.env.example` | Backend en local | Copiar a `backend/.env` |
| `frontend/.env.example` | Frontend en local | Copiar a `frontend/.env.local` |

Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Ejecución con Docker (recomendada)

1. Crea el archivo `.env` en la raíz a partir de `.env.example` y define `JWT_SECRET`.
2. Desde la raíz, levanta todo:

```bash
docker compose up -d --build
```

3. Abre **http://localhost:3001** en el navegador.

Servicios:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

Comandos útiles:

```bash
docker compose ps               # estado de los contenedores
docker compose logs -f backend  # logs del backend en vivo
docker compose down             # detener todo
docker compose down -v          # detener y borrar la base de datos
```

## Ejecución local (sin Docker para la aplicación)

Se usa Docker solo para la base de datos. Docker Compose lee las credenciales del `.env` de la raíz, así que créalo primero (paso 1 de la sección anterior) y luego levanta la base de datos:

```bash
docker compose up -d db
```

**Backend** (http://localhost:3000):

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

**Frontend** (http://localhost:3001, en otra terminal):

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Los valores de `DB_USER`, `DB_PASSWORD` y `DB_NAME` de `backend/.env` deben coincidir con los del `.env` de la raíz.

No ejecutes la versión local y la de Docker al mismo tiempo: ambas usan los puertos 3000 y 3001.

## Pruebas manuales sugeridas

1. Regístrate con dos usuarios distintos (uno en el navegador normal y otro en incógnito).
2. Crea un chat directo desde un usuario y comprueba que el otro lo ve en tiempo real.
3. Envía mensajes en ambos sentidos y verifica que aparecen con remitente y hora.
4. Crea un grupo con tres usuarios y comprueba que un cuarto usuario no ve sus mensajes.
5. Recarga la página y confirma que el historial se conserva.
6. Detén el backend y verifica que aparece el aviso de conexión. Al volver a levantarlo, la conexión debe restablecerse sola.

## API REST

Todas las rutas, salvo `register` y `login`, requieren el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro (nombre, correo, contraseña) |
| POST | `/auth/login` | Inicio de sesión |
| GET | `/auth/me` | Datos del usuario autenticado |
| GET | `/users` | Usuarios registrados, excepto el actual |
| GET | `/chats` | Chats del usuario con su último mensaje y cantidad de no leídos |
| POST | `/chats` | Crear chat (`participantIds`, `name` opcional) |
| GET | `/chats/:id` | Detalle de un chat propio |
| POST | `/chats/:id/read` | Marcar un chat como leído |
| GET | `/chats/:id/messages` | Historial de mensajes (`limit`, `before`) |

## Eventos de WebSocket

Conexión con `auth: { token }` en el handshake.

| Evento | Dirección | Descripción |
|---|---|---|
| `message:send` | cliente → servidor | Envía `{ chatId, content }`; responde con `{ ok: true }` |
| `message:new` | servidor → cliente | Nuevo mensaje en un chat del que el usuario forma parte |
| `chat:new` | servidor → cliente | Chat nuevo en el que el usuario fue incluido |
| `exception` | servidor → cliente | Error de validación o de permisos |

## Decisiones técnicas

- **NestJS** organiza el backend en módulos y ofrece pipes, guards y gateways para WebSockets, lo que separa responsabilidades.
- **TypeORM** con entidades y relaciones tipadas. `synchronize` está activo para facilitar la prueba; en producción se usarían migraciones.
- **Socket.IO** agrega reconexión automática, salas y acknowledgements, que se usan para aislar los mensajes por chat y confirmar el envío.
- **JWT** autentica tanto las peticiones REST como el handshake del socket, con el mismo token.
- **Salas por chat**: cada usuario entra solo a las salas de sus chats, así nunca recibe mensajes ajenos.
- **Mensajes no leídos**: la tabla `chat_read_states` guarda cuándo leyó cada usuario cada chat. El contador se calcula en una sola consulta para todos los chats.
- **Eventos internos** (`EventEmitter2`) desacoplan la creación de chats del gateway de WebSockets.
- **Next.js con App Router** separa las rutas públicas (`(auth)`) de las privadas (`(app)`), con protección de rutas en el layout.
- **Contexto de React** (`AuthContext`, `ChatsContext`, `MessagesContext`) mantiene el estado global sin dependencias adicionales.
- **Tailwind CSS v4** para el diseño, con animaciones definidas en el tema.
- **Timestamps `timestamptz`** para que las horas se muestren correctamente en cualquier zona horaria.
- **Docker Compose** levanta base de datos, backend y frontend con un solo comando, con `depends_on` y healthcheck.

## Solución de problemas

| Problema | Solución |
|---|---|
| `port is already allocated` | Detén el proceso que usa el puerto (3000, 3001 o 5432) |
| El frontend no conecta con el backend | Revisa `FRONTEND_URL` (backend) y `NEXT_PUBLIC_API_URL` (frontend) |
| Cambié la URL del backend y el frontend sigue apuntando a la anterior | En Docker, reconstruye con `docker compose up -d --build frontend` |
| Error al descargar imágenes de Docker | Revisa la conexión o el DNS, y prueba `docker pull postgres:16-alpine` |
| La base de datos no arranca o rechaza la conexión | Comprueba que existe el `.env` de la raíz y que sus credenciales coinciden con `backend/.env` |
| Quiero empezar con una base de datos vacía | `docker compose down -v` y luego `docker compose up -d --build` |