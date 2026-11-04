export type Rol = 'Administrador' | 'Encargado' | 'Cliente'
export type Estado = 'Pendiente' | 'Listo para retiro' | 'Entregado' | 'Cancelado'
export interface Insumo { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number }
export interface Producto { id: string; nombre: string; categoria: string; precio: number; stock: number; descripcion: string; icono: string; disponible: number }
export interface Pedido {
  id: string; cliente: { nombre: string; telefono: string }; retiro: string; estado: Estado
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; mensajeTarjeta: string; metodoPago: string
}
export interface Movimiento { id: string; ref: string; tipo: 'entrada' | 'salida'; cantidad: number; fecha: string; pedidoId?: string }
export interface Usuario { nombre: string; correo: string; rol: Rol }
