// Persistencia en archivo JSON (data.json). Para producción: migrar a PostgreSQL/MongoDB/Firebase.
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

export type Rol = 'Administrador' | 'Encargado' | 'Cliente'
export const ESTADOS = ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado'] as const
export type Estado = (typeof ESTADOS)[number]
export interface Insumo { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number }
export interface Producto { id: string; nombre: string; categoria: string; precio: number; stock: number; descripcion: string; icono: string; receta: { insumoId: string; cantidad: number }[] }
export interface Pedido {
  id: string; cliente: { nombre: string; telefono: string }; retiro: string; estado: Estado
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; mensajeTarjeta: string; metodoPago: string
}
export interface Movimiento { id: string; ref: string; tipo: 'entrada' | 'salida'; cantidad: number; fecha: string; pedidoId?: string }
export interface Usuario { nombre: string; correo: string; rol: Rol; passwordHash: string }
interface Data { insumos: Insumo[]; productos: Producto[]; pedidos: Pedido[]; movimientos: Movimiento[]; usuarios: Usuario[] }

const R = (insumoId: string, cantidad: number) => ({ insumoId, cantidad })
const seed = (): Data => ({
  insumos: [
    { id: 'i1', nombre: 'Rosas', unidad: 'tallos', stock: 120, stockMinimo: 30 },
    { id: 'i2', nombre: 'Girasoles', unidad: 'tallos', stock: 60, stockMinimo: 20 },
    { id: 'i3', nombre: 'Lirios', unidad: 'tallos', stock: 50, stockMinimo: 15 },
    { id: 'i4', nombre: 'Follaje', unidad: 'manojos', stock: 40, stockMinimo: 10 },
    { id: 'i5', nombre: 'Cinta decorativa', unidad: 'metros', stock: 80, stockMinimo: 20 },
    { id: 'i6', nombre: 'Florero de vidrio', unidad: 'unidades', stock: 15, stockMinimo: 5 },
    { id: 'i7', nombre: 'Globos', unidad: 'unidades', stock: 30, stockMinimo: 10 }
  ],
  productos: [
    { id: 'p1', nombre: 'Ramo de 12 rosas', categoria: 'Amor', precio: 25, stock: 8, icono: '🌹', descripcion: 'Rosas frescas con follaje y cinta.', receta: [R('i1', 12), R('i4', 1), R('i5', 1)] },
    { id: 'p2', nombre: 'Girasoles alegres', categoria: 'Cumpleaños', precio: 22, stock: 6, icono: '🌻', descripcion: 'Ramo luminoso de girasoles.', receta: [R('i2', 8), R('i4', 1), R('i5', 1)] },
    { id: 'p3', nombre: 'Lirios blancos', categoria: 'Aniversario', precio: 30, stock: 5, icono: '💐', descripcion: 'Elegante ramo de lirios.', receta: [R('i3', 10), R('i4', 1), R('i5', 1)] },
    { id: 'p4', nombre: 'Arreglo en florero', categoria: 'Aniversario', precio: 38, stock: 4, icono: '🌷', descripcion: 'Rosas y lirios en florero de vidrio.', receta: [R('i1', 6), R('i3', 4), R('i6', 1), R('i4', 1)] },
    { id: 'p5', nombre: 'Ramo de graduación', categoria: 'Graduación', precio: 28, stock: 6, icono: '🎓', descripcion: 'Girasoles y rosas con listón doble.', receta: [R('i2', 5), R('i1', 5), R('i5', 2)] },
    { id: 'p6', nombre: 'Globos de celebración', categoria: 'Complementos', precio: 8, stock: 12, icono: '🎈', descripcion: 'Set de 2 globos para acompañar tu regalo.', receta: [R('i7', 2)] }
  ],
  pedidos: [],
  movimientos: [],
  usuarios: [
    { nombre: 'Administrador', correo: 'admin@hi.com', rol: 'Administrador', passwordHash: bcrypt.hashSync('admin123', 8) },
    { nombre: 'Encargado de pedidos', correo: 'encargado@hi.com', rol: 'Encargado', passwordHash: bcrypt.hashSync('encargado123', 8) },
    { nombre: 'Cliente', correo: 'cliente@hi.com', rol: 'Cliente', passwordHash: bcrypt.hashSync('cliente123', 8) }
  ]
})

const FILE = path.join(__dirname, '..', 'data.json')
export const db: Data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : seed()
// Migración: agrega usuarios nuevos al data.json existente sin borrar datos
for (const u of seed().usuarios) if (!db.usuarios.some((x) => x.correo === u.correo)) db.usuarios.push(u)
export const persist = () => fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
persist()
export const uid = () => Math.random().toString(36).slice(2, 10)

/** Unidades que realmente se pueden armar (limitado por stock terminado e insumos). */
export const disponible = (p: Producto) =>
  Math.max(0, Math.min(p.stock, ...p.receta.map((r) => Math.floor((db.insumos.find((i) => i.id === r.insumoId)?.stock ?? 0) / r.cantidad))))
