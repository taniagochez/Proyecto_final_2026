// Base de datos MongoDB. La conexión se configura en backend/.env (MONGODB_URI); nunca se escribe en el código.
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

export type Rol = 'Administrador' | 'Encargado' | 'Cliente'
export const ESTADOS = ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado'] as const
export type Estado = (typeof ESTADOS)[number]
export interface Insumo { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number }
export interface Producto { id: string; nombre: string; categoria: string; precio: number; stock: number; descripcion: string; icono: string; imagen?: string; receta: { insumoId: string; cantidad: number }[] }
export interface Pedido {
  id: string; cliente: { nombre: string; telefono: string }; retiro: string; estado: Estado
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; mensajeTarjeta: string; metodoPago: string
  facturaId?: string
  creado?: string // ISO; los pedidos anteriores a esta versión no lo tienen
}
export interface Calificacion {
  id: string; productoId: string; correo: string; nombre: string
  estrellas: number; comentario: string; fecha: string
}
export interface Factura {
  id: string; pedidoId: string; fecha: string
  cliente: { nombre: string; telefono: string }
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[]
  total: number; metodoPago: string
  emitidaPor: { nombre: string; correo: string; rol: Rol }
}
export interface Movimiento { id: string; ref: string; tipo: 'entrada' | 'salida'; cantidad: number; fecha: string; pedidoId?: string }
export interface Usuario { nombre: string; correo: string; rol: Rol; passwordHash: string }
interface Data { insumos: Insumo[]; productos: Producto[]; pedidos: Pedido[]; facturas: Factura[]; movimientos: Movimiento[]; usuarios: Usuario[]; calificaciones: Calificacion[] }

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
  facturas: [],
  movimientos: [],
  calificaciones: [],
  usuarios: [
    { nombre: 'Administrador', correo: 'admin@hi.com', rol: 'Administrador', passwordHash: bcrypt.hashSync('admin123', 8) },
    { nombre: 'Encargado de pedidos', correo: 'encargado@hi.com', rol: 'Encargado', passwordHash: bcrypt.hashSync('encargado123', 8) },
    { nombre: 'Cliente', correo: 'cliente@hi.com', rol: 'Cliente', passwordHash: bcrypt.hashSync('cliente123', 8) }
  ]
})


// ---- Conexión ----
const URI = process.env.MONGODB_URI
const client = new MongoClient(URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 8000, ignoreUndefined: true })
const bd = client.db(process.env.MONGODB_DB || 'yli_gochez')

export const insumos = bd.collection<Insumo>('insumos')
export const productos = bd.collection<Producto>('productos')
export const pedidos = bd.collection<Pedido>('pedidos')
export const facturas = bd.collection<Factura>('facturas')
export const movimientos = bd.collection<Movimiento>('movimientos')
export const usuarios = bd.collection<Usuario>('usuarios')
export const calificaciones = bd.collection<Calificacion>('calificaciones')
const contadores = bd.collection<{ _id: string; n: number }>('contadores') // numeración P-0001, F-0001 sin repetirse

/** Opciones de consulta para no devolver el campo interno `_id` de Mongo. */
export const sinId = { projection: { _id: 0 } } as const

export async function conectarDB() {
  if (!URI) throw new Error('Falta MONGODB_URI en backend/.env (copia backend/.env.example y completa la conexión)')
  await client.connect()
  await Promise.all([
    insumos.createIndex({ id: 1 }, { unique: true }),
    productos.createIndex({ id: 1 }, { unique: true }),
    usuarios.createIndex({ correo: 1 }, { unique: true }),
    pedidos.createIndex({ id: 1 }, { unique: true }),
    pedidos.createIndex({ retiro: 1 }),
    facturas.createIndex({ id: 1 }, { unique: true }),
    facturas.createIndex({ pedidoId: 1 }, { unique: true }), // un pedido = una factura, garantizado por la base de datos
    calificaciones.createIndex({ productoId: 1, correo: 1 }, { unique: true }), // una calificación por cliente y ramo
    movimientos.createIndex({ fecha: -1 })
  ])
}
export const cerrarDB = () => client.close()

/** Carga los datos iniciales que falten (usuarios, insumos y catálogo). No pisa stock ni contraseñas existentes. */
export async function sembrar() {
  const s = seed()
  await usuarios.bulkWrite(s.usuarios.map((u) => ({ updateOne: { filter: { correo: u.correo }, update: { $setOnInsert: u }, upsert: true } })))
  await insumos.bulkWrite(s.insumos.map((i) => ({ updateOne: { filter: { id: i.id }, update: { $setOnInsert: i }, upsert: true } })))
  // Del catálogo se refrescan imagen, ícono y descripción (para que cambios en el código se reflejen); el stock no se toca
  await productos.bulkWrite(s.productos.map(({ imagen, icono, descripcion, ...resto }) => ({
    updateOne: { filter: { id: resto.id }, update: { $set: { imagen, icono, descripcion }, $setOnInsert: resto }, upsert: true }
  })))
}

/** Siguiente número de una serie (atómico: dos pedidos simultáneos nunca reciben el mismo número). */
export const siguiente = async (serie: string) =>
  (await contadores.findOneAndUpdate({ _id: serie }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' }))!.n
/** Asegura que la serie no baje de `n` (lo usa la migración desde data.json). */
export const fijarContador = (serie: string, n: number) => contadores.updateOne({ _id: serie }, { $max: { n } }, { upsert: true })

export const uid = () => Math.random().toString(36).slice(2, 10)
export const normalizarCorreo = (c: unknown) => String(c ?? '').trim().toLowerCase()

/** Unidades que realmente se pueden armar (limitado por stock terminado e insumos). */
export const disponible = (p: Producto, ins: Insumo[]) =>
  Math.max(0, Math.min(p.stock, ...p.receta.map((r) => Math.floor((ins.find((i) => i.id === r.insumoId)?.stock ?? 0) / r.cantidad))))