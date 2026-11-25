// Especificación OpenAPI 3.0 servida por Swagger UI en /api/docs
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` })
const json = (schema: object) => ({ 'application/json': { schema } })
const ok = (description: string, schema?: object, code = '200') => ({ [code]: { description, ...(schema && { content: json(schema) }) } })
const errs = (...c: string[]) => Object.fromEntries(c.map((k) => [k, { description: 'Error', content: json(ref('Error')) }]))
const sec = [{ bearerAuth: [] }]
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
const arr = (n: string) => ({ type: 'array', items: ref(n) })

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'API Yli Gochez Floristería y Detalles', version: '1.0.0', description: 'Pedidos con retiro en local y control automatizado de inventario.\n\nUsuarios demo: `admin@hi.com / admin123`, `encargado@hi.com / encargado123` y `cliente@hi.com / cliente123`. Usa **Authorize** con el token de `/auth/login`.' },
  servers: [{ url: '/api' }],
  tags: [{ name: 'Auth' }, { name: 'Asistente IA' }, { name: 'Catálogo' }, { name: 'Calificaciones' }, { name: 'Pedidos' }, { name: 'Facturas' }, { name: 'Inventario' }, { name: 'Dashboard' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Estado: { type: 'string', enum: ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado'] },
      Rol: { type: 'string', enum: ['Administrador', 'Encargado', 'Cliente'] },
      Usuario: { type: 'object', properties: { nombre: { type: 'string' }, correo: { type: 'string' }, rol: ref('Rol') } },
      LoginInput: { type: 'object', required: ['correo', 'password'], properties: { correo: { type: 'string', example: 'admin@hi.com' }, password: { type: 'string', example: 'admin123' } } },
      RegisterInput: { type: 'object', required: ['nombre', 'correo', 'password'], properties: { nombre: { type: 'string', example: 'Ana Pérez' }, correo: { type: 'string', example: 'ana@correo.com' }, password: { type: 'string', minLength: 6, example: 'secreto123' } } },
      LoginResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('Usuario') } },
      Producto: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, categoria: { type: 'string' }, precio: { type: 'number' }, stock: { type: 'integer' }, descripcion: { type: 'string' }, icono: { type: 'string' }, disponible: { type: 'integer', description: 'Unidades armables según stock e insumos' }, promedio: { type: 'number', description: 'Calificación promedio (0 si aún no tiene)', example: 4.5 }, totalCalificaciones: { type: 'integer' } } },
      CalificacionInput: { type: 'object', required: ['estrellas'], properties: { estrellas: { type: 'integer', minimum: 1, maximum: 5, example: 5 }, comentario: { type: 'string', maxLength: 300, example: 'Llegó fresquísimo' } } },
      Calificaciones: { type: 'object', properties: { promedio: { type: 'number' }, totalCalificaciones: { type: 'integer' }, distribucion: { type: 'array', description: 'Cantidad de votos de 1 a 5 estrellas', items: { type: 'integer' } }, mia: { type: 'object', nullable: true, description: 'Calificación del usuario autenticado, si existe' }, resenas: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, estrellas: { type: 'integer' }, comentario: { type: 'string' }, fecha: { type: 'string', format: 'date-time' } } } } } },
      Disponibilidad: { type: 'object', properties: { fecha: { type: 'string', example: '2026-12-24' }, max: { type: 'integer', example: 3 }, horas: { type: 'object', additionalProperties: { type: 'object', properties: { pedidos: { type: 'integer' }, lleno: { type: 'boolean' } } }, example: { '09:00': { pedidos: 1, lleno: false }, '10:00': { pedidos: 3, lleno: true } } } } },
      Analitica: { type: 'object', description: 'Reportes del dashboard. Cuenta pedidos no cancelados según su fecha de retiro. anio=0 significa todos los años.', properties: { anios: { type: 'array', items: { type: 'integer' } }, anio: { type: 'integer' }, mes: { type: 'integer' }, anual: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, cantidad: { type: 'integer' }, ingresos: { type: 'number' } } } }, porMes: { type: 'array', items: { type: 'object', properties: { mes: { type: 'integer' }, unidades: { type: 'integer' }, pedidos: { type: 'integer' }, ingresos: { type: 'number' } } } }, mensual: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, cantidad: { type: 'integer' }, ingresos: { type: 'number' } } } }, clientes: { type: 'object', properties: { total: { type: 'integer' }, ranking: { type: 'array', items: { type: 'object' } }, mas: { type: 'object', nullable: true }, menos: { type: 'object', nullable: true }, empatadosMenos: { type: 'integer' } } }, fechas: { type: 'array', items: { type: 'object', properties: { clave: { type: 'string' }, nombre: { type: 'string' }, mes: { type: 'integer' }, dia: { type: 'integer' }, pedidos: { type: 'integer' }, unidades: { type: 'integer' }, ingresos: { type: 'number' }, top: { type: 'string', nullable: true } } } } } },
      Insumo: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, unidad: { type: 'string' }, stock: { type: 'integer' }, stockMinimo: { type: 'integer' } } },
      Movimiento: { type: 'object', properties: { id: { type: 'string' }, ref: { type: 'string' }, tipo: { type: 'string', enum: ['entrada', 'salida'] }, cantidad: { type: 'integer' }, fecha: { type: 'string', format: 'date-time' }, pedidoId: { type: 'string' } } },
      PedidoInput: {
        type: 'object', required: ['cliente', 'retiro', 'items', 'metodoPago'],
        properties: {
          cliente: { type: 'object', required: ['nombre', 'telefono'], properties: { nombre: { type: 'string', example: 'Ana Pérez' }, telefono: { type: 'string', example: '7000-0000' } } },
          retiro: { type: 'string', format: 'date-time', description: 'Debe ser posterior a la fecha actual. Máximo 3 pedidos por hora (409 si la hora está llena)' },
          items: { type: 'array', items: { type: 'object', required: ['productoId', 'cantidad'], properties: { productoId: { type: 'string', example: 'p1' }, cantidad: { type: 'integer', example: 1 } } } },
          mensajeTarjeta: { type: 'string', maxLength: 200 },
          metodoPago: { type: 'string', enum: ['Efectivo al retirar', 'Transferencia', 'POS'] }
        }
      },
      Pedido: {
        type: 'object', properties: {
          id: { type: 'string', example: 'P-0001' }, cliente: { type: 'object', properties: { nombre: { type: 'string' }, telefono: { type: 'string' } } },
          retiro: { type: 'string', format: 'date-time' }, estado: ref('Estado'),
          items: { type: 'array', items: { type: 'object', properties: { productoId: { type: 'string' }, nombre: { type: 'string' }, cantidad: { type: 'integer' }, precio: { type: 'number' } } } },
          total: { type: 'number' }, mensajeTarjeta: { type: 'string' }, metodoPago: { type: 'string' },
          facturaId: { type: 'string', example: 'F-0001', description: 'Presente si el pedido ya fue facturado' }
        }
      },
      Factura: {
        type: 'object', properties: {
          id: { type: 'string', example: 'F-0001' }, pedidoId: { type: 'string', example: 'P-0001' }, fecha: { type: 'string', format: 'date-time' },
          cliente: { type: 'object', properties: { nombre: { type: 'string' }, telefono: { type: 'string' } } },
          items: { type: 'array', items: { type: 'object', properties: { productoId: { type: 'string' }, nombre: { type: 'string' }, cantidad: { type: 'integer' }, precio: { type: 'number' } } } },
          total: { type: 'number' }, metodoPago: { type: 'string' }, emitidaPor: ref('Usuario')
        }
      },
      ChatInput: { type: 'object', required: ['messages'], properties: { messages: { type: 'array', description: 'Historial de la conversación; el último mensaje debe ser del usuario', items: { type: 'object', required: ['role', 'content'], properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string', maxLength: 1000 } } }, example: [{ role: 'user', content: 'Busco un regalo de aniversario' }] } } },
      ChatResponse: { type: 'object', properties: { reply: { type: 'string' }, productos: { type: 'array', description: 'Ids de productos recomendados (para mostrar con botón Agregar)', items: { type: 'string' }, example: ['p3'] } } },
      Dashboard: { type: 'object', properties: { ingresos: { type: 'number' }, pedidos: { type: 'integer' }, ticketPromedio: { type: 'number' }, insumosBajos: { type: 'integer' }, top: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, cantidad: { type: 'integer' } } } } } }
    }
  },
  paths: {
    '/chat': { post: { tags: ['Asistente IA'], summary: 'Conversar con el asistente de IA (público). Conoce el catálogo y la disponibilidad actuales', requestBody: { required: true, content: json(ref('ChatInput')) }, responses: { ...ok('Respuesta del asistente', ref('ChatResponse')), ...errs('400', '429', '502', '503') } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Iniciar sesión (devuelve JWT)', requestBody: { required: true, content: json(ref('LoginInput')) }, responses: { ...ok('Sesión iniciada', ref('LoginResponse')), ...errs('401') } } },
    '/auth/register': { post: { tags: ['Auth'], summary: 'Crear cuenta de cliente (público). Devuelve la sesión iniciada', requestBody: { required: true, content: json(ref('RegisterInput')) }, responses: { ...ok('Cuenta creada', ref('LoginResponse'), '201'), ...errs('400', '409') } } },
    '/productos': { get: { tags: ['Catálogo'], summary: 'Listar productos con disponibilidad', parameters: [{ name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por ocasión' }], responses: ok('Lista de productos', arr('Producto')) } },
    '/productos/{id}/calificaciones': {
      get: { tags: ['Calificaciones'], summary: 'Promedio, distribución y reseñas de un ramo (público; con token incluye la calificación propia)', parameters: [idParam], responses: { ...ok('Calificaciones', ref('Calificaciones')), ...errs('404') } },
      post: { tags: ['Calificaciones'], summary: 'Calificar la calidad de un ramo de 1 a 5 (rol Cliente). Una por cliente y ramo: calificar de nuevo reemplaza la anterior', security: sec, parameters: [idParam], requestBody: { required: true, content: json(ref('CalificacionInput')) }, responses: { ...ok('Calificación actualizada', { type: 'object', properties: { promedio: { type: 'number' }, totalCalificaciones: { type: 'integer' } } }, '201'), ...errs('400', '401', '403', '404') } }
    },
    '/pedidos/disponibilidad': { get: { tags: ['Pedidos'], summary: 'Pedidos por hora de un día (máximo 3 por hora) para saber qué horas siguen libres (público)', parameters: [{ name: 'fecha', in: 'query', required: true, schema: { type: 'string', example: '2026-12-24' }, description: 'AAAA-MM-DD' }], responses: { ...ok('Ocupación por hora', ref('Disponibilidad')), ...errs('400') } } },
    '/pedidos': {
      get: { tags: ['Pedidos'], summary: 'Cola de pedidos ordenada por hora de retiro (Administrador/Encargado)', security: sec, responses: { ...ok('Pedidos', arr('Pedido')), ...errs('401', '403') } },
      post: { tags: ['Pedidos'], summary: 'Crear pedido para retiro en local (requiere sesión). Descuenta producto e insumos', security: sec, requestBody: { required: true, content: json(ref('PedidoInput')) }, responses: { ...ok('Pedido creado', ref('Pedido'), '201'), ...errs('400', '401', '404', '409') } }
    },
    '/pedidos/{id}/estado': { patch: { tags: ['Pedidos'], summary: 'Cambiar estado del pedido', security: sec, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['estado'], properties: { estado: ref('Estado') } }) }, responses: { ...ok('Pedido actualizado', ref('Pedido')), ...errs('400', '401', '403', '404') } } },
    '/pedidos/{id}/factura': { post: { tags: ['Facturas'], summary: 'Generar factura de un pedido ya entregado (Administrador/Encargado)', security: sec, parameters: [idParam], responses: { ...ok('Factura generada', ref('Factura'), '201'), ...errs('401', '403', '404', '409') } } },
    '/facturas': { get: { tags: ['Facturas'], summary: 'Listar facturas emitidas (Administrador/Encargado)', security: sec, responses: { ...ok('Facturas', arr('Factura')), ...errs('401', '403') } } },
    '/facturas/{id}': { get: { tags: ['Facturas'], summary: 'Obtener una factura (Administrador/Encargado)', security: sec, parameters: [idParam], responses: { ...ok('Factura', ref('Factura')), ...errs('401', '403', '404') } } },
    '/insumos': { get: { tags: ['Inventario'], summary: 'Listar insumos (Administrador)', security: sec, responses: { ...ok('Insumos', arr('Insumo')), ...errs('401', '403') } } },
    '/insumos/{id}/entradas': { post: { tags: ['Inventario'], summary: 'Registrar entrada de almacén (Administrador)', security: sec, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['cantidad'], properties: { cantidad: { type: 'integer', minimum: 1, example: 20 } } }) }, responses: { ...ok('Insumo actualizado', ref('Insumo'), '201'), ...errs('400', '401', '403', '404') } } },
    '/movimientos': { get: { tags: ['Inventario'], summary: 'Historial de movimientos (Administrador)', security: sec, responses: { ...ok('Movimientos', arr('Movimiento')), ...errs('401', '403') } } },
    '/dashboard/analitica': { get: { tags: ['Dashboard'], summary: 'Más vendidos (anual/mensual), clientes que más y menos compran y ventas en fechas importantes (Administrador)', security: sec, parameters: [{ name: 'anio', in: 'query', schema: { type: 'integer' }, description: 'Año; 0 = todos. Por defecto el actual' }, { name: 'mes', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 }, description: 'Mes para el reporte mensual. Por defecto el actual' }], responses: { ...ok('Analítica', ref('Analitica')), ...errs('400', '401', '403') } } },
    '/dashboard': { get: { tags: ['Dashboard'], summary: 'Indicadores de ventas (Administrador)', security: sec, responses: { ...ok('Métricas', ref('Dashboard')), ...errs('401', '403') } } }
  }
}
