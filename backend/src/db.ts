// Persistencia en archivo JSON (data.json). Para producción: migrar a PostgreSQL/MongoDB/Firebase.
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

export type Rol = 'Administrador' | 'Encargado' | 'Cliente'
export const ESTADOS = ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado'] as const
export type Estado = (typeof ESTADOS)[number]
export interface Insumo { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number }
export interface Producto { id: string; nombre: string; categoria: string; precio: number; stock: number; descripcion: string; icono: string; imagen?: string; receta: { insumoId: string; cantidad: number }[] }
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
    { id: 'i7', nombre: 'Globos', unidad: 'unidades', stock: 30, stockMinimo: 10 },
    { id: 'i8', nombre: 'Gerberas', unidad: 'tallos', stock: 30, stockMinimo: 10 }
  ],
  productos: [
    { id: 'p1', nombre: 'Ramo de 12 rosas', categoria: 'Amor', precio: 25, stock: 8, icono: '🌹', imagen: '/img/productos/Rosas Ramo.jpeg', descripcion: 'Rosas frescas con follaje y cinta.', receta: [R('i1', 12), R('i4', 1), R('i5', 1)] },
    { id: 'p2', nombre: 'Girasoles alegres', categoria: 'Cumpleaños', precio: 22, stock: 6, icono: '🌻', imagen: '/img/productos/Girasoles.jpeg', descripcion: 'Ramo luminoso de girasoles.', receta: [R('i2', 8), R('i4', 1), R('i5', 1)] },
    { id: 'p3', nombre: 'Lirios blancos', categoria: 'Aniversario', precio: 30, stock: 5, icono: '💐', imagen: '/img/productos/Lirios Blancos.jpeg', descripcion: 'Elegante ramo de lirios.', receta: [R('i3', 10), R('i4', 1), R('i5', 1)] },
    { id: 'p4', nombre: 'Gerberas Rosadas', categoria: 'Aniversario', precio: 38, stock: 4, icono: '🌷', imagen: '/img/productos/Gerberas Rosadas.jpeg', descripcion: 'Gerberas rosadas con clavel y rosas.', receta: [R('i1', 6), R('i3', 4), R('i6', 1), R('i4', 1)] },
    { id: 'p5', nombre: 'Ramo de graduación', categoria: 'Graduación', precio: 28, stock: 6, icono: '🎓', imagen: '/img/productos/Rosas Azules.jpeg', descripcion: 'Ramo de vibrantes rosas azules.', receta: [R('i2', 5), R('i1', 5), R('i5', 2)] },
    { id: 'p6', nombre: 'Arreglos con Globo', categoria: 'Cumpleaños', precio: 30, stock: 12, icono: '🎈', imagen: '/img/productos/Arreglo Frutas.jpeg', descripcion: 'Arreglo con frutas y globo.', receta: [R('i3', 1), R('i8', 3), R('i7', 1)] },
    { id: 'p7', nombre: 'Globos Cumpleaños', categoria: 'Cumpleaños', precio: 30, stock: 5, icono: '🎈', imagen: '/img/productos/Base Lirio y Globo.jpeg', descripcion: 'Lirios con lingo globo.', receta: [R('i8', 10), R('i4', 1), R('i5', 1)] },
    { id: 'p8', nombre: 'Girasoles Rojos', categoria: 'Amor', precio: 28, stock: 5, icono: '🌻', imagen: '/img/productos/Pilsener Girasoles.jpeg', descripcion: 'Arreglo audaz con cerveza.', receta: [R('i2', 4), R('i4', 12)] },
    { id: 'p9', nombre: 'Petalos Morados', categoria: 'Aniversario', precio: 25, stock: 5, icono: '💐', imagen: '/img/productos/Morado Rosado.jpeg', descripcion: 'Lindo ramo de tonos morados.', receta: [R('i8', 2), R('i1', 12), R('i4', 12)] },
    { id: 'p10', nombre: 'Gigante de Amor', categoria: 'Cumpleaños', precio: 25, stock: 5, icono: '🌹', imagen: '/img/productos/Buchon Yli Gochez.jpeg', descripcion: 'Ramo Buchon al estilo Yli Gochez.', receta: [R('i8', 24), R('i1', 24), R('i4', 12)] },
    { id: 'p11', nombre: 'Lirios Rosados', categoria: 'Cumpleaños', precio: 25, stock: 5, icono: '💐', imagen: '/img/productos/Lirio Rosado.jpeg', descripcion: 'Luminoso ramo de lirios blancos.', receta: [R('i1', 12), R('i3', 2), R('i4', 12)] },
    { id: 'p12', nombre: 'Gran Cumpleaños', categoria: 'Cumpleaños', precio: 25, stock: 5, icono: '🌹', imagen: '/img/productos/Ramo Rosas Liston.jpeg', descripcion: 'Perfecto Ramo para cumpleaños.', receta: [R('i1', 30), R('i3', 18), R('i4', 5)] },
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
const base = seed()
for (const i of base.insumos) if (!db.insumos.some((x) => x.id === i.id)) db.insumos.push(i)
for (const p of base.productos) {
  const ex = db.productos.find((x) => x.id === p.id)
  if (!ex) db.productos.push(p)
  else { ex.imagen = p.imagen; ex.icono = p.icono; ex.descripcion = p.descripcion }
}
export const persist = () => fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
persist()
export const uid = () => Math.random().toString(36).slice(2, 10)

/** Unidades que realmente se pueden armar (limitado por stock terminado e insumos). */
export const disponible = (p: Producto) =>
  Math.max(0, Math.min(p.stock, ...p.receta.map((r) => Math.floor((db.insumos.find((i) => i.id === r.insumoId)?.stock ?? 0) / r.cantidad))))
