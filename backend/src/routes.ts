import { NextFunction, Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db, disponible, ESTADOS, Estado, Factura, persist, Rol, uid } from './db'
import chat from './chat'
import { analitica } from './analitica'
import { fechaLocal, franjaHora } from './tiempo'

const SECRET = process.env.JWT_SECRET || 'hi-gochez-dev-secret'
const r = Router()
r.use(chat) // POST /api/chat — asistente de IA

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
/** Pedidos activos (no cancelados) cuyo retiro cae en la misma hora que `retiro`. */
const pedidosEnHora = (retiro: string | Date) => db.pedidos.filter((p) => p.estado !== 'Cancelado' && franjaHora(p.retiro) === franjaHora(retiro)).length
const MSG_HORA_LLENA = `Ese horario ya tiene ${MAX_PEDIDOS_POR_HORA} pedidos (el máximo por hora). Elige otra hora.`
const ADMIN: Rol[] = ['Administrador'], STAFF: Rol[] = ['Administrador', 'Encargado']
const mov = (ref: string, tipo: 'entrada' | 'salida', cantidad: number, pedidoId?: string) =>
  db.movimientos.unshift({ id: uid(), ref, tipo, cantidad, fecha: new Date().toISOString(), pedidoId })

r.post('/auth/login', (req, res) => {
  const { correo, password } = req.body ?? {}
  const u = db.usuarios.find((x) => x.correo === String(correo ?? '').trim())
  if (!u || !bcrypt.compareSync(String(password ?? ''), u.passwordHash)) return void res.status(401).json({ error: 'Credenciales incorrectas' })
  const user = { nombre: u.nombre, correo: u.correo, rol: u.rol }
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user })
})

// Registro público: crea siempre una cuenta de Cliente (los demás roles los crea el administrador)
r.post('/auth/register', (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim(), correo = String(req.body?.correo ?? '').trim().toLowerCase(), password = String(req.body?.password ?? '')
  const err = (m: string, c = 400) => void res.status(c).json({ error: m })
  if (nombre.length < 2 || nombre.length > 80) return err('Escribe tu nombre completo')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Correo inválido')
  if (password.length < 6) return err('La contraseña debe tener al menos 6 caracteres')
  if (db.usuarios.some((x) => x.correo.toLowerCase() === correo)) return err('Ya existe una cuenta con ese correo', 409)
  db.usuarios.push({ nombre, correo, rol: 'Cliente', passwordHash: bcrypt.hashSync(password, 8) }); persist()
  const user = { nombre, correo, rol: 'Cliente' as Rol }
  res.status(201).json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user })
})

r.get('/productos', (req, res) => {
  const cat = req.query.categoria
  res.json(db.productos.filter((p) => !cat || p.categoria === cat).map((p) => ({ ...p, disponible: disponible(p), ...resumenCalificaciones(p.id) })))
})

// ---- Calificaciones: los clientes califican la calidad de cada ramo (1 a 5 estrellas; una por cliente y ramo) ----
const resumenCalificaciones = (productoId: string) => {
  const l = db.calificaciones.filter((c) => c.productoId === productoId)
  return { promedio: l.length ? Math.round((l.reduce((s, c) => s + c.estrellas, 0) / l.length) * 10) / 10 : 0, totalCalificaciones: l.length }
}
r.get('/productos/:id/calificaciones', (req, res) => {
  if (!db.productos.some((p) => p.id === req.params.id)) return void res.status(404).json({ error: 'Producto no encontrado' })
  const todas = db.calificaciones.filter((c) => c.productoId === req.params.id)
  const u = usuarioOpcional(req)
  const mia = u ? todas.find((c) => c.correo === u.correo) : undefined
  res.json({
    ...resumenCalificaciones(req.params.id),
    distribucion: [1, 2, 3, 4, 5].map((n) => todas.filter((c) => c.estrellas === n).length),
    mia: mia ? { estrellas: mia.estrellas, comentario: mia.comentario } : null,
    resenas: [...todas].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)).slice(0, 20).map(({ nombre, estrellas, comentario, fecha }) => ({ nombre, estrellas, comentario, fecha }))
  })
})
r.post('/productos/:id/calificaciones', auth('Cliente'), (req, res) => {
  const p = db.productos.find((x) => x.id === req.params.id)
  if (!p) return void res.status(404).json({ error: 'Producto no encontrado' })
  const estrellas = Number(req.body?.estrellas)
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return void res.status(400).json({ error: 'La calificación debe ser de 1 a 5 estrellas' })
  const comentario = String(req.body?.comentario ?? '').trim().slice(0, 300)
  const u = res.locals.user as { nombre: string; correo: string }
  const previa = db.calificaciones.find((c) => c.productoId === p.id && c.correo === u.correo)
  if (previa) Object.assign(previa, { estrellas, comentario, fecha: new Date().toISOString() }) // el cliente puede cambiar su calificación
  else db.calificaciones.push({ id: uid(), productoId: p.id, correo: u.correo, nombre: u.nombre, estrellas, comentario, fecha: new Date().toISOString() })
  persist()
  res.status(previa ? 200 : 201).json(resumenCalificaciones(p.id))
})

r.get('/insumos', auth(...ADMIN), (_q, res) => res.json(db.insumos))
r.post('/insumos/:id/entradas', auth(...ADMIN), (req, res) => {
  const i = db.insumos.find((x) => x.id === req.params.id)
  const cant = Number(req.body?.cantidad)
  if (!i) return void res.status(404).json({ error: 'Insumo no encontrado' })
  if (!Number.isInteger(cant) || cant < 1) return void res.status(400).json({ error: 'Cantidad inválida' })
  i.stock += cant; mov(i.nombre, 'entrada', cant); persist()
  res.status(201).json(i)
})
r.get('/movimientos', auth(...ADMIN), (_q, res) => res.json(db.movimientos))

r.get('/pedidos', auth(...STAFF), (_q, res) => res.json([...db.pedidos].sort((a, b) => +new Date(a.retiro) - +new Date(b.retiro))))

// Ocupación por hora de un día (público): sirve para bloquear en el formulario las horas llenas
r.get('/pedidos/disponibilidad', (req, res) => {
  const fecha = String(req.query.fecha ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return void res.status(400).json({ error: 'Fecha inválida (use AAAA-MM-DD)' })
  const horas: Record<string, { pedidos: number; lleno: boolean }> = {}
  for (const h of HORAS_RETIRO) {
    const clave = `${fecha}T${String(h).padStart(2, '0')}`
    const n = db.pedidos.filter((p) => p.estado !== 'Cancelado' && franjaHora(p.retiro) === clave).length
    horas[`${String(h).padStart(2, '0')}:00`] = { pedidos: n, lleno: n >= MAX_PEDIDOS_POR_HORA }
  }
  res.json({ fecha, max: MAX_PEDIDOS_POR_HORA, horas })
})

  r.post('/pedidos', auth(), (req, res) => {
  const { cliente, retiro, items, mensajeTarjeta = '', metodoPago } = req.body ?? {}
  const err = (m: string, c = 400) => void res.status(c).json({ error: m })
  if (!cliente?.nombre?.trim()) return err('El nombre es obligatorio')
  if (!/^[\d\s+-]{8,}$/.test(cliente?.telefono ?? '')) return err('Teléfono inválido')
  if (!(new Date(retiro).getTime() > Date.now())) return err('La fecha de retiro debe ser posterior a la actual')
  if (pedidosEnHora(retiro) >= MAX_PEDIDOS_POR_HORA) return err(MSG_HORA_LLENA, 409)
  if (!['Efectivo al retirar', 'Transferencia', 'POS'].includes(metodoPago)) return err('Método de pago inválido')
  if (!Array.isArray(items) || !items.length) return err('El pedido no tiene productos')

  // Agrupar cantidades por producto y validar disponibilidad antes de modificar nada
  const qty = new Map<string, number>()
  for (const it of items) {
    if (!Number.isInteger(it?.cantidad) || it.cantidad < 1) return err('Cantidad inválida')
    qty.set(it.productoId, (qty.get(it.productoId) ?? 0) + it.cantidad)
  }
  const need = new Map<string, number>()
  for (const [pid, q] of qty) {
    const p = db.productos.find((x) => x.id === pid)
    if (!p) return err(`Producto ${pid} no existe`, 404)
    if (p.stock < q) return err(`Sin disponibilidad de "${p.nombre}"`, 409)
    p.receta.forEach((x) => need.set(x.insumoId, (need.get(x.insumoId) ?? 0) + x.cantidad * q))
  }
  for (const [iid, q] of need) {
    const i = db.insumos.find((x) => x.id === iid)!
    if (i.stock < q) return err(`Sin insumos suficientes (${i.nombre})`, 409)
  }

  const id = 'P-' + String(db.pedidos.length + 1).padStart(4, '0')
  const lineas: Pedido['items'] = []
  for (const [pid, q] of qty) {
    const p = db.productos.find((x) => x.id === pid)!
    p.stock -= q; mov(p.nombre, 'salida', q, id)
    lineas.push({ productoId: pid, nombre: p.nombre, cantidad: q, precio: p.precio })
  }
  for (const [iid, q] of need) { const i = db.insumos.find((x) => x.id === iid)!; i.stock -= q; mov(i.nombre, 'salida', q, id) }
  const pedido: Pedido = {
    id, cliente: { nombre: cliente.nombre.trim(), telefono: cliente.telefono }, retiro: new Date(retiro).toISOString(),
    estado: 'Pendiente', items: lineas, total: lineas.reduce((s, l) => s + l.precio * l.cantidad, 0),
    mensajeTarjeta: String(mensajeTarjeta).slice(0, 200), metodoPago, creado: new Date().toISOString()
  }
  db.pedidos.push(pedido); persist()
  res.status(201).json(pedido)
})
type Pedido = (typeof db.pedidos)[number]

r.patch('/pedidos/:id/estado', auth(...STAFF), (req, res) => {
  const p = db.pedidos.find((x) => x.id === req.params.id)
  if (!p) return void res.status(404).json({ error: 'Pedido no encontrado' })
  if (!ESTADOS.includes(req.body?.estado)) return void res.status(400).json({ error: 'Estado inválido' })
  if (p.facturaId && req.body.estado !== p.estado) return void res.status(409).json({ error: `El pedido ya fue facturado (${p.facturaId}); no se puede cambiar su estado` })
  // Reactivar un pedido cancelado vuelve a ocupar su hora: respeta el límite
  if (p.estado === 'Cancelado' && req.body.estado !== 'Cancelado' && pedidosEnHora(p.retiro) >= MAX_PEDIDOS_POR_HORA) return void res.status(409).json({ error: MSG_HORA_LLENA })
  p.estado = req.body.estado as Estado; persist()
  res.json(p)
})

// ---- Facturación: solo Administrador/Encargado y solo sobre pedidos ya realizados (entregados) ----
const ESTADO_FACTURABLE: Estado = 'Entregado'

r.post('/pedidos/:id/factura', auth(...STAFF), (req, res) => {
  const p = db.pedidos.find((x) => x.id === req.params.id)
  if (!p) return void res.status(404).json({ error: 'Pedido no encontrado' })
  if (p.estado !== ESTADO_FACTURABLE) return void res.status(409).json({ error: `Solo se pueden facturar pedidos en estado "${ESTADO_FACTURABLE}" (estado actual: ${p.estado})` })
  if (p.facturaId) return void res.status(409).json({ error: `El pedido ya tiene la factura ${p.facturaId}` })
  const f: Factura = {
    id: 'F-' + String(db.facturas.length + 1).padStart(4, '0'), pedidoId: p.id, fecha: new Date().toISOString(),
    cliente: { ...p.cliente }, items: p.items.map((i) => ({ ...i })), total: p.total, metodoPago: p.metodoPago,
    emitidaPor: res.locals.user
  }
  db.facturas.push(f); p.facturaId = f.id; persist()
  res.status(201).json(f)
})
r.get('/facturas', auth(...STAFF), (_q, res) => res.json([...db.facturas].reverse()))
r.get('/facturas/:id', auth(...STAFF), (req, res) => {
  const f = db.facturas.find((x) => x.id === req.params.id)
  if (!f) return void res.status(404).json({ error: 'Factura no encontrada' })
  res.json(f)
})

r.get('/dashboard', auth(...ADMIN), (_q, res) => {
  const v = db.pedidos.filter((p) => p.estado !== 'Cancelado')
  const ingresos = v.reduce((s, p) => s + p.total, 0)
  const m: Record<string, number> = {}
  v.forEach((p) => p.items.forEach((i) => (m[i.nombre] = (m[i.nombre] ?? 0) + i.cantidad)))
  res.json({
    ingresos, pedidos: v.length, ticketPromedio: v.length ? ingresos / v.length : 0,
    insumosBajos: db.insumos.filter((i) => i.stock <= i.stockMinimo).length,
    top: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad }))
  })
})
r.get('/dashboard/analitica', auth(...ADMIN), (req, res) => {
  const n = (v: unknown, def: number) => (v === undefined || v === '' ? def : Number(v))
  const anio = n(req.query.anio, fechaLocal(Date.now()).anio), mes = n(req.query.mes, fechaLocal(Date.now()).mes)
  if (!Number.isInteger(anio) || anio < 0 || anio > 3000) return void res.status(400).json({ error: 'Año inválido (0 = todos)' })
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return void res.status(400).json({ error: 'Mes inválido (1 a 12)' })
  res.json(analitica(anio, mes))
})
export default r