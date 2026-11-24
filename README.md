# Yli Gochez Floristería y Detalles — Pedidos e inventario

Monorepo con dos aplicaciones:

| Carpeta     | Tecnología                                                  | Puerto |
|-------------|-------------------------------------------------------------|--------|
| `backend/`  | Node.js · Express · TypeScript · JWT · **Swagger (OpenAPI 3)** | 3000   |
| `frontend/` | Vue 3 · TypeScript · Vite · Vuetify 3 · Pinia · Axios       | 5173   |

## Ejecutar en Visual Studio Code
Necesitas Node.js 18+. Abre **dos terminales** (`Ctrl + ñ`):

```bash
# Terminal 1 — API
cd backend
npm install
npm run dev

# Terminal 2 — Web
cd frontend
npm install
npm run dev
```

- Tienda / sistema: http://localhost:5173
- **Swagger UI:** http://localhost:3000/api/docs  (JSON: `/api/openapi.json`)

Extensión recomendada: **Vue - Official (Volar)**.

## Probar la API en Swagger
1. `POST /auth/login` con `admin@hi.com` / `admin123` → copia el `token`.
2. Botón **Authorize** (arriba a la derecha) → pega el token.
3. Prueba `GET /pedidos`, `POST /insumos/{id}/entradas`, `GET /dashboard`, etc.

## Usuarios de prueba
- Administrador: `admin@hi.com` / `admin123` — pedidos, inventario y dashboard.
- Encargado: `encargado@hi.com` / `encargado123` — solo cola de pedidos.
- Cliente: `cliente@hi.com` / `cliente123` — catálogo y pedidos (el nombre se rellena solo).

## Endpoints
| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público |
| POST | `/api/auth/register` | Público — crea una cuenta de Cliente e inicia sesión |
| GET | `/api/productos` | Público |
| POST | `/api/pedidos` | Público (descuenta producto + insumos) |
| GET | `/api/pedidos` | Administrador / Encargado |
| PATCH | `/api/pedidos/{id}/estado` | Administrador / Encargado |
| GET | `/api/insumos`, `/api/movimientos`, `/api/dashboard` | Administrador |
| POST | `/api/insumos/{id}/entradas` | Administrador |
| POST | `/api/pedidos/{id}/factura` | Administrador / Encargado — solo pedidos en estado *Entregado*, una factura por pedido |
| GET | `/api/facturas`, `/api/facturas/{id}` | Administrador / Encargado |
| GET | `/api/productos/{id}/calificaciones` | Público (con token incluye la calificación propia) |
| POST | `/api/productos/{id}/calificaciones` | Cliente — 1 a 5 estrellas + comentario; una por cliente y ramo (volver a calificar la reemplaza) |
| GET | `/api/pedidos/disponibilidad?fecha=AAAA-MM-DD` | Público — pedidos por hora del día |
| GET | `/api/dashboard/analitica?anio=&mes=` | Administrador — más vendidos, clientes y fechas importantes |

## Reglas de pedidos y reportes
- **Máximo 3 pedidos por hora** de retiro (los cancelados no cuentan). Las horas llenas y las que ya pasaron aparecen bloqueadas en el formulario, y el servidor lo valida también (409).
- **Dashboard → analítica:** más vendido anual y mensual, cliente que más y que menos compra (se identifica por teléfono) y ventas en fechas importantes. Cuenta pedidos no cancelados según su **fecha de retiro**.
- Las fechas importantes y su ventana (±1 día) se ajustan en `backend/src/analitica.ts` (`FECHAS_IMPORTANTES`, `VENTANA_DIAS`).
- Para ver los gráficos con datos de ejemplo: detén el servidor y ejecuta `npm run demo-data` en `backend/` (agrega pedidos `D-xxxx` de 2025–2026 y calificaciones; no toca el inventario).

## Notas
- Persistencia: archivo `backend/data.json` (se crea solo con datos de ejemplo; bórralo para reiniciar).
  Para producción, sustituir `backend/src/db.ts` por PostgreSQL/MongoDB/Firebase.
- Variable `JWT_SECRET` y `PORT` configurables por entorno. Contraseñas guardadas con bcrypt.
- Tema pastel en `frontend/src/plugins/vuetify.ts` (rosado, verde y blanco).
