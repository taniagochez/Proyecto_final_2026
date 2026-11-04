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
  tags: [{ name: 'Auth' }, { name: 'Catálogo' }, { name: 'Pedidos' }, { name: 'Inventario' }, { name: 'Dashboard' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Estado: { type: 'string', enum: ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado'] },
      Rol: { type: 'string', enum: ['Administrador', 'Encargado', 'Cliente'] },
      Usuario: { type: 'object', properties: { nombre: { type: 'string' }, correo: { type: 'string' }, rol: ref('Rol') } },
      LoginInput: { type: 'object', required: ['correo', 'password'], properties: { correo: { type: 'string', example: 'admin@hi.com' }, password: { type: 'string', example: 'admin123' } } },
      LoginResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('Usuario') } },
      Producto: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, categoria: { type: 'string' }, precio: { type: 'number' }, stock: { type: 'integer' }, descripcion: { type: 'string' }, icono: { type: 'string' }, disponible: { type: 'integer', description: 'Unidades armables según stock e insumos' } } },
      Insumo: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, unidad: { type: 'string' }, stock: { type: 'integer' }, stockMinimo: { type: 'integer' } } },
      Movimiento: { type: 'object', properties: { id: { type: 'string' }, ref: { type: 'string' }, tipo: { type: 'string', enum: ['entrada', 'salida'] }, cantidad: { type: 'integer' }, fecha: { type: 'string', format: 'date-time' }, pedidoId: { type: 'string' } } },
      PedidoInput: {
        type: 'object', required: ['cliente', 'retiro', 'items', 'metodoPago'],
        properties: {
          cliente: { type: 'object', required: ['nombre', 'telefono'], properties: { nombre: { type: 'string', example: 'Ana Pérez' }, telefono: { type: 'string', example: '7000-0000' } } },
          retiro: { type: 'string', format: 'date-time', description: 'Debe ser posterior a la fecha actual' },
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
          total: { type: 'number' }, mensajeTarjeta: { type: 'string' }, metodoPago: { type: 'string' }
        }
      },
      Dashboard: { type: 'object', properties: { ingresos: { type: 'number' }, pedidos: { type: 'integer' }, ticketPromedio: { type: 'number' }, insumosBajos: { type: 'integer' }, top: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, cantidad: { type: 'integer' } } } } } }
    }
  },
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Iniciar sesión (devuelve JWT)', requestBody: { required: true, content: json(ref('LoginInput')) }, responses: { ...ok('Sesión iniciada', ref('LoginResponse')), ...errs('401') } } },
    '/productos': { get: { tags: ['Catálogo'], summary: 'Listar productos con disponibilidad', parameters: [{ name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Filtrar por ocasión' }], responses: ok('Lista de productos', arr('Producto')) } },
    '/pedidos': {
      get: { tags: ['Pedidos'], summary: 'Cola de pedidos ordenada por hora de retiro (Administrador/Encargado)', security: sec, responses: { ...ok('Pedidos', arr('Pedido')), ...errs('401', '403') } },
      post: { tags: ['Pedidos'], summary: 'Crear pedido para retiro en local (público). Descuenta producto e insumos', requestBody: { required: true, content: json(ref('PedidoInput')) }, responses: { ...ok('Pedido creado', ref('Pedido'), '201'), ...errs('400', '404', '409') } }
    },
    '/pedidos/{id}/estado': { patch: { tags: ['Pedidos'], summary: 'Cambiar estado del pedido', security: sec, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['estado'], properties: { estado: ref('Estado') } }) }, responses: { ...ok('Pedido actualizado', ref('Pedido')), ...errs('400', '401', '403', '404') } } },
    '/insumos': { get: { tags: ['Inventario'], summary: 'Listar insumos (Administrador)', security: sec, responses: { ...ok('Insumos', arr('Insumo')), ...errs('401', '403') } } },
    '/insumos/{id}/entradas': { post: { tags: ['Inventario'], summary: 'Registrar entrada de almacén (Administrador)', security: sec, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['cantidad'], properties: { cantidad: { type: 'integer', minimum: 1, example: 20 } } }) }, responses: { ...ok('Insumo actualizado', ref('Insumo'), '201'), ...errs('400', '401', '403', '404') } } },
    '/movimientos': { get: { tags: ['Inventario'], summary: 'Historial de movimientos (Administrador)', security: sec, responses: { ...ok('Movimientos', arr('Movimiento')), ...errs('401', '403') } } },
    '/dashboard': { get: { tags: ['Dashboard'], summary: 'Indicadores de ventas (Administrador)', security: sec, responses: { ...ok('Métricas', ref('Dashboard')), ...errs('401', '403') } } }
  }
}
