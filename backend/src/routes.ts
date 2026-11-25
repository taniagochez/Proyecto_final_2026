import { NextFunction, Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  calificaciones, disponible, ESTADOS, Estado, Factura, facturas, insumos, movimientos, normalizarCorreo, Pedido, pedidos,
  productos, Rol, siguiente, sinId, uid, usuarios
} from './db'
import chat from './chat'
import { analitica } from './analitica'
import { fechaLocal, franjaHora } from './tiempo'

const SECRET = process.env.JWT_SECRET || 'hi-gochez-dev-secret'
const r = Router()
r.use(chat) // POST /api/chat — asistente de IA

/** Envuelve un handler async: si algo falla (p. ej. la base de datos), responde 500 en vez de colgar la petición. */
const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next) }
const esDuplicado = (e: unknown) => (e as { code?: number })?.code === 11000

/** Middleware JWT con control de rol. Sin roles = cualquier usuario autenticado. */
const auth = (...roles: Rol[]) => (req: Request, res: Response, next: NextFunction) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return void res.status(401).json({ error: 'No autenticado' })
  try {
    const u = jwt.verify(h.slice(7), SECRET) as { nombre: string; correo: string; rol: Rol }
    if (roles.length && !roles.includes(u.rol)) return void res.status(403).json({ error: 'Sin permisos' })
    res.locals.user = { nombre: u.nombre, correo: u.correo, rol: u.rol }
    next()
  } catch { res.status(401).json({ error: 'Token inválido o vencido' }) }
}
/** Usuario del token si lo hay (para rutas públicas que cambian según la sesión). */
const usuarioOpcional = (req: Request) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  try { return jwt.verify(h.slice(7), SECRET) as { nombre: string; correo: string; rol: Rol } } catch { return null }
}
const MAX_PEDIDOS_POR_HORA = 3
const HORAS_RETIRO = Array.from({ length: 10 }, (_, i) => i + 9) // 09:00 a 18:00
const HORA_MS = 3_600_000
/** Pedidos activos (no cancelados) cuyo retiro cae en la misma hora que `retiro`.
 *  La zona horaria de la tienda (UTC-6) es de horas enteras, así que la franja local coincide con la hora UTC. */
const pedidosEnHora = (retiro: string | Date) => {
  const ini = Math.floor(new Date(retiro).getTime() / HORA_MS) * HORA_MS
  return pedidos.countDocuments({ estado: { $ne: 'Cancelado' }, retiro: { $gte: new Date(ini).toISOString(), $lt: new Date(ini + HORA_MS).toISOString() } })
}
const MSG_HORA_LLENA = `Ese horario ya tiene ${MAX_PEDIDOS_POR_HORA} pedidos (el máximo por hora). Elige otra hora.`
const ADMIN: Rol[] = ['Administrador'], STAFF: Rol[] = ['Administrador', 'Encargado']

r.post('/auth/login', h(async (req, res) => {
  const { correo, password } = req.body ?? {}
  const u = await usuarios.findOne({ correo: normalizarCorreo(correo) }, sinId)
  if (!u || !bcrypt.compareSync(String(password ?? ''), u.passwordHash)) return void res.status(401).json({ error: 'Credenciales incorrectas' })
  const user = { nombre: u.nombre, correo: u.correo, rol: u.rol }
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user })
}))

// Registro público: crea siempre una cuenta de Cliente (los demás roles los crea el administrador)
r.post('/auth/register', h(async (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim(), correo = normalizarCorreo(req.body?.correo), password = String(req.body?.password ?? '')
  const err = (m: string, c = 400) => void res.status(c).json({ error: m })
  if (nombre.length < 2 || nombre.length > 80) return err('Escribe tu nombre completo')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Correo inválido')
  if (password.length < 6) return err('La contraseña debe tener al menos 6 caracteres')
  try { await usuarios.insertOne({ nombre, correo, rol: 'Cliente', passwordHash: bcrypt.hashSync(password, 8) }) }
  catch (e) { if (esDuplicado(e)) return err('Ya existe una cuenta con ese correo', 409); throw e }
  const user = { nombre, correo, rol: 'Cliente' as Rol }
  res.status(201).json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user })
}))

// ---- Calificaciones: los clientes califican la calidad de cada ramo (1 a 5 estrellas; una por cliente y ramo) ----
const resumir = (estrellas: number[]) => ({
  promedio: estrellas.length ? Math.round((estrellas.reduce((s, e) => s + e, 0) / estrellas.length) * 10) / 10 : 0,
  totalCalificaciones: estrellas.length
})
const resumenCalificaciones = async (productoId: string) =>
  resumir((await calificaciones.find({ productoId }, { projection: { estrellas: 1, _id: 0 } }).toArray()).map((c) => c.estrellas))

r.get('/productos', h(async (req, res) => {
  const cat = req.query.categoria
  const [lista, ins, califs] = await Promise.all([
    productos.find(cat ? { categoria: String(cat) } : {}, sinId).sort({ _id: 1 }).toArray(),
    insumos.find({}, sinId).toArray(),
    calificaciones.find({}, { projection: { productoId: 1, estrellas: 1, _id: 0 } }).toArray()
  ])
  res.json(lista.map((p) => ({ ...p, disponible: disponible(p, ins), ...resumir(califs.filter((c) => c.productoId === p.id).map((c) => c.estrellas)) })))
}))

r.get('/productos/:id/calificaciones', h(async (req, res) => {
  if (!(await productos.countDocuments({ id: req.params.id }))) return void res.status(404).json({ error: 'Producto no encontrado' })
  const todas = await calificaciones.find({ productoId: req.params.id }, sinId).toArray()
  const u = usuarioOpcional(req)
  const mia = u ? todas.find((c) => c.correo === u.correo) : undefined
  res.json({
    ...resumir(todas.map((c) => c.estrellas)),
    distribucion: [1, 2, 3, 4, 5].map((n) => todas.filter((c) => c.estrellas === n).length),
    mia: mia ? { estrellas: mia.estrellas, comentario: mia.comentario } : null,
    resenas: [...todas].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)).slice(0, 20).map(({ nombre, estrellas, comentario, fecha }) => ({ nombre, estrellas, comentario, fecha }))
  })
}))
r.post('/productos/:id/calificaciones', auth('Cliente'), h(async (req, res) => {
  const p = await productos.findOne({ id: req.params.id }, sinId)
  if (!p) return void res.status(404).json({ error: 'Producto no encontrado' })
  const estrellas = Number(req.body?.estrellas)
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return void res.status(400).json({ error: 'La calificación debe ser de 1 a 5 estrellas' })
  const comentario = String(req.body?.comentario ?? '').trim().slice(0, 300)
  const u = res.locals.user as { nombre: string; correo: string }
  // Un solo paso: si el cliente ya calificó, cambia su calificación; si no, crea una nueva
  const q = await calificaciones.updateOne(
    { productoId: p.id, correo: u.correo },
    { $set: { estrellas, comentario, fecha: new Date().toISOString() }, $setOnInsert: { id: uid(), nombre: u.nombre } },
    { upsert: true }
  )
  res.status(q.upsertedCount ? 201 : 200).json(await resumenCalificaciones(p.id))
}))

const mov = (ref: string, tipo: 'entrada' | 'salida', cantidad: number, pedidoId?: string) => ({ id: uid(), ref, tipo, cantidad, fecha: new Date().toISOString(), pedidoId })

r.get('/insumos', auth(...ADMIN), h(async (_q, res) => { res.json(await insumos.find({}, sinId).sort({ _id: 1 }).toArray()) }))
r.post('/insumos/:id/entradas', auth(...ADMIN), h(async (req, res) => {
  const i = await insumos.findOne({ id: req.params.id }, sinId)
  const cant = Number(req.body?.cantidad)
  if (!i) return void res.status(404).json({ error: 'Insumo no encontrado' })
  if (!Number.isInteger(cant) || cant < 1) return void res.status(400).json({ error: 'Cantidad inválida' })
  const nuevo = await insumos.findOneAndUpdate({ id: i.id }, { $inc: { stock: cant } }, { returnDocument: 'after', ...sinId })
  await movimientos.insertOne(mov(i.nombre, 'entrada', cant))
  res.status(201).json(nuevo)
}))
r.get('/movimientos', auth(...ADMIN), h(async (_q, res) => { res.json(await movimientos.find({}, sinId).sort({ fecha: -1, _id: -1 }).toArray()) }))

r.get('/pedidos', auth(...STAFF), h(async (_q, res) => { res.json(await pedidos.find({}, sinId).sort({ retiro: 1 }).toArray()) }))

// Ocupación por hora de un día (público): sirve para bloquear en el formulario las horas llenas
r.get('/pedidos/disponibilidad', h(async (req, res) => {
  const fecha = String(req.query.fecha ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return void res.status(400).json({ error: 'Fecha inválida (use AAAA-MM-DD)' })
  const ini = Date.parse(`${fecha}T06:00:00Z`) // el día local (UTC-6) empieza a las 06:00 UTC
  const delDia = Number.isNaN(ini) ? [] : await pedidos.find(
    { estado: { $ne: 'Cancelado' }, retiro: { $gte: new Date(ini).toISOString(), $lt: new Date(ini + 24 * HORA_MS).toISOString() } },
    { projection: { retiro: 1, _id: 0 } }
  ).toArray()
  const horas: Record<string, { pedidos: number; lleno: boolean }> = {}
  for (const hh of HORAS_RETIRO) {
    const clave = `${fecha}T${String(hh).padStart(2, '0')}`
    const n = delDia.filter((p) => franjaHora(p.retiro) === clave).length
    horas[`${String(hh).padStart(2, '0')}:00`] = { pedidos: n, lleno: n >= MAX_PEDIDOS_POR_HORA }
  }
  res.json({ fecha, max: MAX_PEDIDOS_POR_HORA, horas })
}))

r.post('/pedidos', auth(), h(async (req, res) => {
  const { cliente, retiro, items, mensajeTarjeta = '', metodoPago } = req.body ?? {}
  const err = (m: string, c = 400) => void res.status(c).json({ error: m })
  const telefono = String(cliente?.telefono ?? '')
  if (typeof cliente?.nombre !== 'string' || !cliente.nombre.trim()) return err('El nombre es obligatorio')
  if (!/^[\d\s+-]{8,}$/.test(telefono)) return err('Teléfono inválido')
  if (!(new Date(retiro).getTime() > Date.now())) return err('La fecha de retiro debe ser posterior a la actual')
  if ((await pedidosEnHora(retiro)) >= MAX_PEDIDOS_POR_HORA) return err(MSG_HORA_LLENA, 409)
  if (!['Efectivo al retirar', 'Transferencia', 'POS'].includes(metodoPago)) return err('Método de pago inválido')
  if (!Array.isArray(items) || !items.length) return err('El pedido no tiene productos')

  // Agrupar cantidades por producto y validar disponibilidad antes de modificar nada
  const qty = new Map<string, number>()
  for (const it of items) {
    if (typeof it?.productoId !== 'string') return err('Producto inválido')
    if (!Number.isInteger(it?.cantidad) || it.cantidad < 1) return err('Cantidad inválida')
    qty.set(it.productoId, (qty.get(it.productoId) ?? 0) + it.cantidad)
  }
  const prods = await productos.find({ id: { $in: [...qty.keys()] } }, sinId).toArray()
  const need = new Map<string, number>()
  for (const [pid, q] of qty) {
    const p = prods.find((x) => x.id === pid)
    if (!p) return err(`Producto ${pid} no existe`, 404)
    if (p.stock < q) return err(`Sin disponibilidad de "${p.nombre}"`, 409)
    p.receta.forEach((x) => need.set(x.insumoId, (need.get(x.insumoId) ?? 0) + x.cantidad * q))
  }
  const ins = await insumos.find({ id: { $in: [...need.keys()] } }, sinId).toArray()
  for (const [iid, q] of need) {
    const i = ins.find((x) => x.id === iid)
    if (!i || i.stock < q) return err(`Sin insumos suficientes (${i?.nombre ?? iid})`, 409)
  }

  // Descuento de stock ATÓMICO: cada actualización solo se aplica si todavía alcanza el stock.
  // Así dos compras simultáneas nunca dejan el inventario en negativo; si algo falla se devuelve lo ya descontado.
  const hechos: { tipo: 'p' | 'i'; id: string; q: number }[] = []
  const revertir = () => Promise.all(hechos.map((x) => (x.tipo === 'p' ? productos : insumos).updateOne({ id: x.id }, { $inc: { stock: x.q } })))
  let pedido!: Pedido
  try {
    for (const [pid, q] of qty) {
      const ok = await productos.updateOne({ id: pid, stock: { $gte: q } }, { $inc: { stock: -q } })
      if (!ok.matchedCount) { await revertir(); return err(`Sin disponibilidad de "${prods.find((x) => x.id === pid)!.nombre}"`, 409) }
      hechos.push({ tipo: 'p', id: pid, q })
    }
    for (const [iid, q] of need) {
      const ok = await insumos.updateOne({ id: iid, stock: { $gte: q } }, { $inc: { stock: -q } })
      if (!ok.matchedCount) { await revertir(); return err(`Sin insumos suficientes (${ins.find((x) => x.id === iid)!.nombre})`, 409) }
      hechos.push({ tipo: 'i', id: iid, q })
    }
    const id = 'P-' + String(await siguiente('pedidos')).padStart(4, '0')
    const lineas: Pedido['items'] = [...qty].map(([pid, q]) => { const p = prods.find((x) => x.id === pid)!; return { productoId: pid, nombre: p.nombre, cantidad: q, precio: p.precio } })
    pedido = {
      id, cliente: { nombre: cliente.nombre.trim(), telefono }, retiro: new Date(retiro).toISOString(),
      estado: 'Pendiente', items: lineas, total: lineas.reduce((s, l) => s + l.precio * l.cantidad, 0),
      mensajeTarjeta: String(mensajeTarjeta).slice(0, 200), metodoPago, creado: new Date().toISOString()
    }
    await pedidos.insertOne({ ...pedido })
  } catch (e) { await revertir().catch(() => {}); throw e }

  await movimientos.insertMany([
    ...[...qty].map(([pid, q]) => mov(prods.find((x) => x.id === pid)!.nombre, 'salida', q, pedido.id)),
    ...[...need].map(([iid, q]) => mov(ins.find((x) => x.id === iid)!.nombre, 'salida', q, pedido.id))
  ])
  res.status(201).json(pedido)
}))

r.patch('/pedidos/:id/estado', auth(...STAFF), h(async (req, res) => {
  const p = await pedidos.findOne({ id: req.params.id }, sinId)
  if (!p) return void res.status(404).json({ error: 'Pedido no encontrado' })
  if (!ESTADOS.includes(req.body?.estado)) return void res.status(400).json({ error: 'Estado inválido' })
  if (p.facturaId && req.body.estado !== p.estado) return void res.status(409).json({ error: `El pedido ya fue facturado (${p.facturaId}); no se puede cambiar su estado` })
  // Reactivar un pedido cancelado vuelve a ocupar su hora: respeta el límite
  if (p.estado === 'Cancelado' && req.body.estado !== 'Cancelado' && (await pedidosEnHora(p.retiro)) >= MAX_PEDIDOS_POR_HORA) return void res.status(409).json({ error: MSG_HORA_LLENA })
  const estado = req.body.estado as Estado
  await pedidos.updateOne({ id: p.id }, { $set: { estado } })
  res.json({ ...p, estado })
}))

// ---- Facturación: solo Administrador/Encargado y solo sobre pedidos ya realizados (entregados) ----
const ESTADO_FACTURABLE: Estado = 'Entregado'

r.post('/pedidos/:id/factura', auth(...STAFF), h(async (req, res) => {
  const p = await pedidos.findOne({ id: req.params.id }, sinId)
  if (!p) return void res.status(404).json({ error: 'Pedido no encontrado' })
  if (p.estado !== ESTADO_FACTURABLE) return void res.status(409).json({ error: `Solo se pueden facturar pedidos en estado "${ESTADO_FACTURABLE}" (estado actual: ${p.estado})` })
  if (p.facturaId) return void res.status(409).json({ error: `El pedido ya tiene la factura ${p.facturaId}` })
  const f: Factura = {
    id: 'F-' + String(await siguiente('facturas')).padStart(4, '0'), pedidoId: p.id, fecha: new Date().toISOString(),
    cliente: { ...p.cliente }, items: p.items.map((i) => ({ ...i })), total: p.total, metodoPago: p.metodoPago,
    emitidaPor: res.locals.user
  }
  try { await facturas.insertOne({ ...f }) } // el índice único por pedido impide facturar dos veces aunque lleguen peticiones a la vez
  catch (e) { if (esDuplicado(e)) return void res.status(409).json({ error: 'El pedido ya tiene factura' }); throw e }
  await pedidos.updateOne({ id: p.id }, { $set: { facturaId: f.id } })
  res.status(201).json(f)
}))
r.get('/facturas', auth(...STAFF), h(async (_q, res) => { res.json(await facturas.find({}, sinId).sort({ _id: -1 }).toArray()) }))
r.get('/facturas/:id', auth(...STAFF), h(async (req, res) => {
  const f = await facturas.findOne({ id: req.params.id }, sinId)
  if (!f) return void res.status(404).json({ error: 'Factura no encontrada' })
  res.json(f)
}))

r.get('/dashboard', auth(...ADMIN), h(async (_q, res) => {
  const [v, ins] = await Promise.all([pedidos.find({ estado: { $ne: 'Cancelado' } }, sinId).toArray(), insumos.find({}, sinId).toArray()])
  const ingresos = v.reduce((s, p) => s + p.total, 0)
  const m: Record<string, number> = {}
  v.forEach((p) => p.items.forEach((i) => (m[i.nombre] = (m[i.nombre] ?? 0) + i.cantidad)))
  res.json({
    ingresos, pedidos: v.length, ticketPromedio: v.length ? ingresos / v.length : 0,
    insumosBajos: ins.filter((i) => i.stock <= i.stockMinimo).length,
    top: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad }))
  })
}))
r.get('/dashboard/analitica', auth(...ADMIN), h(async (req, res) => {
  const n = (v: unknown, def: number) => (v === undefined || v === '' ? def : Number(v))
  const anio = n(req.query.anio, fechaLocal(Date.now()).anio), mes = n(req.query.mes, fechaLocal(Date.now()).mes)
  if (!Number.isInteger(anio) || anio < 0 || anio > 3000) return void res.status(400).json({ error: 'Año inválido (0 = todos)' })
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return void res.status(400).json({ error: 'Mes inválido (1 a 12)' })
  res.json(analitica(await pedidos.find({ estado: { $ne: 'Cancelado' } }, sinId).toArray(), anio, mes))
}))
export default r