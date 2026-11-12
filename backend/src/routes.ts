import { NextFunction, Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db, disponible, ESTADOS, Estado, persist, Rol, uid } from './db'
import chat from './chat'

const SECRET = process.env.JWT_SECRET || 'hi-gochez-dev-secret'
const r = Router()
r.use(chat) // POST /api/chat — asistente de IA

/** Middleware JWT con control de rol. Sin roles = cualquier usuario autenticado. */
const auth = (...roles: Rol[]) => (req: Request, res: Response, next: NextFunction) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return void res.status(401).json({ error: 'No autenticado' })
  try {
    const u = jwt.verify(h.slice(7), SECRET) as { rol: Rol }
    if (roles.length && !roles.includes(u.rol)) return void res.status(403).json({ error: 'Sin permisos' })
    next()
  } catch { res.status(401).json({ error: 'Token inválido o vencido' }) }
}
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

r.get('/productos', (req, res) => {
  const cat = req.query.categoria
  res.json(db.productos.filter((p) => !cat || p.categoria === cat).map((p) => ({ ...p, disponible: disponible(p) })))
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

r.post('/pedidos', (req, res) => {
  const { cliente, retiro, items, mensajeTarjeta = '', metodoPago } = req.body ?? {}
  const err = (m: string, c = 400) => void res.status(c).json({ error: m })
  if (!cliente?.nombre?.trim()) return err('El nombre es obligatorio')
  if (!/^[\d\s+-]{8,}$/.test(cliente?.telefono ?? '')) return err('Teléfono inválido')
  if (!(new Date(retiro).getTime() > Date.now())) return err('La fecha de retiro debe ser posterior a la actual')
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
    mensajeTarjeta: String(mensajeTarjeta).slice(0, 200), metodoPago
  }
  db.pedidos.push(pedido); persist()
  res.status(201).json(pedido)
})
type Pedido = (typeof db.pedidos)[number]

r.patch('/pedidos/:id/estado', auth(...STAFF), (req, res) => {
  const p = db.pedidos.find((x) => x.id === req.params.id)
  if (!p) return void res.status(404).json({ error: 'Pedido no encontrado' })
  if (!ESTADOS.includes(req.body?.estado)) return void res.status(400).json({ error: 'Estado inválido' })
  p.estado = req.body.estado as Estado; persist()
  res.json(p)
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
export default r
