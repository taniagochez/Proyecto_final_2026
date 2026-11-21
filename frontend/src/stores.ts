import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, errMsg } from './services/api'
import type { Estado, Insumo, Movimiento, Pedido, Producto, Usuario } from './types'

export const useInventory = defineStore('inventory', () => {
  const productos = ref<Producto[]>([])
  const insumos = ref<Insumo[]>([])
  const movimientos = ref<Movimiento[]>([])
  const bajos = computed(() => insumos.value.filter((i) => i.stock <= i.stockMinimo))
  const cargarProductos = async () => { productos.value = (await api.get('/productos')).data }
  const cargarAdmin = async () => {
    const [i, m] = await Promise.all([api.get('/insumos'), api.get('/movimientos')])
    insumos.value = i.data; movimientos.value = m.data
  }
  const entrada = async (insumoId: string, cantidad: number) => {
    await api.post(`/insumos/${insumoId}/entradas`, { cantidad }); await cargarAdmin()
  }
  cargarProductos().catch(() => {})
  return { productos, insumos, movimientos, bajos, cargarProductos, cargarAdmin, entrada }
})

export const useCart = defineStore('cart', () => {
  const inv = useInventory()
  const items = ref<{ id: string; cantidad: number }[]>(JSON.parse(localStorage.getItem('hg_cart') || '[]'))
  const guardar = () => localStorage.setItem('hg_cart', JSON.stringify(items.value))
  const lineas = computed(() => items.value.flatMap((i) => {
    const p = inv.productos.find((x) => x.id === i.id)
    return p ? [{ p, cantidad: i.cantidad }] : []
  }))
  const total = computed(() => lineas.value.reduce((s, l) => s + l.p.precio * l.cantidad, 0))
  const count = computed(() => items.value.reduce((s, i) => s + i.cantidad, 0))
  function add(p: Producto) {
    const l = items.value.find((i) => i.id === p.id)
    const n = (l?.cantidad ?? 0) + 1
    if (n > p.disponible) return false
    if (l) l.cantidad = n; else items.value.push({ id: p.id, cantidad: 1 })
    guardar(); return true
  }
  function restar(id: string) {
    const l = items.value.find((i) => i.id === id)
    if (l && --l.cantidad <= 0) items.value = items.value.filter((i) => i.id !== id)
    guardar()
  }
  const vaciar = () => { items.value = []; guardar() }
  return { items, lineas, total, count, add, restar, vaciar }
})

export const useAuth = defineStore('auth', () => {
  const user = ref<Usuario | null>(JSON.parse(localStorage.getItem('hg_user') || 'null'))
  const guardarSesion = (data: { user: Usuario; token: string }) => {
    user.value = data.user
    localStorage.setItem('hg_user', JSON.stringify(data.user)); localStorage.setItem('hg_token', data.token)
  }
  async function login(correo: string, password: string) {
    try {
      const { data } = await api.post('/auth/login', { correo, password })
      guardarSesion(data)
      return true
    } catch { return false }
  }
  /** Crea una cuenta de Cliente y deja la sesión iniciada. */
  async function register(nombre: string, correo: string, password: string) {
    try {
      const { data } = await api.post('/auth/register', { nombre, correo, password })
      guardarSesion(data)
      return { ok: true as const }
    } catch (e) { return { ok: false as const, error: errMsg(e) } }
  }
  function logout() { user.value = null; localStorage.removeItem('hg_user'); localStorage.removeItem('hg_token') }
  return { user, login, register, logout }
})

/** Gestión de usuarios (solo Administrador): lista y crea/elimina encargados. */
export const useUsuarios = defineStore('usuarios', () => {
  const lista = ref<Usuario[]>([])
  const cargar = async () => { lista.value = (await api.get('/usuarios')).data }
  async function crearEncargado(nombre: string, correo: string, password: string) {
    try { await api.post('/usuarios', { nombre, correo, password }); await cargar(); return { ok: true as const } }
    catch (e) { return { ok: false as const, error: errMsg(e) } }
  }
  async function editarEncargado(correo: string, cambios: { nombre?: string; password?: string }) {
    try { await api.patch(`/usuarios/${encodeURIComponent(correo)}`, cambios); await cargar(); return { ok: true as const } }
    catch (e) { return { ok: false as const, error: errMsg(e) } }
  }
  async function eliminar(correo: string) {
    try { await api.delete(`/usuarios/${encodeURIComponent(correo)}`); await cargar(); return { ok: true as const } }
    catch (e) { return { ok: false as const, error: errMsg(e) } }
  }
  return { lista, cargar, crearEncargado, editarEncargado, eliminar }
})

export const useOrders = defineStore('orders', () => {
  const inv = useInventory()
  const pedidos = ref<Pedido[]>([])
  const cargar = async () => { pedidos.value = (await api.get('/pedidos')).data }
  async function crear(d: { cliente: Pedido['cliente']; retiro: string; mensajeTarjeta: string; metodoPago: string; lineas: { p: Producto; cantidad: number }[] }) {
    try {
      const { lineas, ...resto } = d
      const { data } = await api.post('/pedidos', { ...resto, items: lineas.map((l) => ({ productoId: l.p.id, cantidad: l.cantidad })) })
      await inv.cargarProductos()
      return { ok: true as const, id: data.id as string }
    } catch (e) { return { ok: false as const, error: errMsg(e) } }
  }
  async function cambiar(p: Pedido, estado: Estado) { await api.patch(`/pedidos/${p.id}/estado`, { estado }); p.estado = estado }
  return { pedidos, cargar, crear, cambiar }
})
