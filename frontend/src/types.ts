export type Rol = 'Administrador' | 'Encargado' | 'Cliente'
export type Estado = 'Pendiente' | 'Listo para retiro' | 'Entregado' | 'Cancelado'
export interface Insumo { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number }
export interface Producto { id: string; nombre: string; categoria: string; precio: number; stock: number; descripcion: string; icono: string; imagen?: string; disponible: number; promedio: number; totalCalificaciones: number }
export interface Pedido {
  id: string; cliente: { nombre: string; telefono: string }; retiro: string; estado: Estado
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; mensajeTarjeta: string; metodoPago: string; facturaId?: string
}
export interface Factura {
  id: string; pedidoId: string; fecha: string; cliente: { nombre: string; telefono: string }
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; metodoPago: string; emitidaPor: Usuario
}
export interface Movimiento { id: string; ref: string; tipo: 'entrada' | 'salida'; cantidad: number; fecha: string; pedidoId?: string }
export interface Usuario { nombre: string; correo: string; rol: Rol }
export interface Resena { nombre: string; estrellas: number; comentario: string; fecha: string }
export interface Calificaciones {
  promedio: number; totalCalificaciones: number; distribucion: number[]
  mia: { estrellas: number; comentario: string } | null; resenas: Resena[]
}
export interface ItemVenta { nombre: string; cantidad: number; ingresos: number }
export interface ClienteVenta { nombre: string; telefono: string; pedidos: number; total: number }
export interface FechaImportante { clave: string; nombre: string; mes: number; dia: number; pedidos: number; unidades: number; ingresos: number; top: string | null }
export interface Analitica {
  anios: number[]; anio: number; mes: number
  anual: ItemVenta[]; mensual: ItemVenta[]
  porMes: { mes: number; unidades: number; pedidos: number; ingresos: number }[]
  clientes: { total: number; ranking: ClienteVenta[]; mas: ClienteVenta | null; menos: ClienteVenta | null; empatadosMenos: number }
  fechas: FechaImportante[]; ventanaDias: number
}
