// Reportes del dashboard: más vendidos, clientes y fechas importantes.
// Cuenta pedidos no cancelados y los ubica por su FECHA DE RETIRO (cuándo se entrega el arreglo).
import { db } from './db'
import { fechaLocal } from './tiempo'

/** Fechas especiales (El Salvador). Se pueden ajustar aquí sin tocar nada más. */
export const FECHAS_IMPORTANTES = [
  { clave: 'amor', nombre: 'Día del Amor y la Amistad', mes: 2, dia: 14 },
  { clave: 'amarillas', nombre: 'Día de las flores amarillas', mes: 3, dia: 21 },
  { clave: 'madre', nombre: 'Día de la Madre', mes: 5, dia: 10 },
  { clave: 'padre', nombre: 'Día del Padre', mes: 6, dia: 17 },
  { clave: 'novia', nombre: 'Día de la Novia', mes: 8, dia: 1 },
  { clave: 'novio', nombre: 'Día del Novio', mes: 10, dia: 3 },
  { clave: 'muertos', nombre: 'Día de los Muertos', mes: 11, dia: 2 },
  { clave: 'navidad', nombre: 'Navidad', mes: 12, dia: 25 }
] as const
/** Un pedido cuenta para una fecha si se retira ese día o hasta N días antes/después. */
export const VENTANA_DIAS = 1

const dias = (anio: number, mes: number, dia: number) => Math.round(Date.UTC(anio, mes - 1, dia) / 86_400_000)
const unidades = (p: (typeof db.pedidos)[number]) => p.items.reduce((s, i) => s + i.cantidad, 0)

function topProductos(pedidos: typeof db.pedidos, limite = 0) {
  const m = new Map<string, { nombre: string; cantidad: number; ingresos: number }>()
  for (const p of pedidos) for (const i of p.items) {
    const x = m.get(i.productoId) ?? { nombre: i.nombre, cantidad: 0, ingresos: 0 }
    x.cantidad += i.cantidad; x.ingresos += i.cantidad * i.precio; m.set(i.productoId, x)
  }
  const l = [...m.values()].sort((a, b) => b.cantidad - a.cantidad || b.ingresos - a.ingresos)
  return limite ? l.slice(0, limite) : l
}

/** anio = 0 significa "todos los años". */
export function analitica(anio: number, mes: number) {
  const validos = db.pedidos.filter((p) => p.estado !== 'Cancelado').map((p) => ({ p, f: fechaLocal(p.retiro) }))
  const actual = fechaLocal(Date.now()).anio
  const anios = [...new Set([actual, ...validos.map((v) => v.f.anio)])].sort((a, b) => b - a)
  const sel = validos.filter((v) => !anio || v.f.anio === anio)

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const ps = sel.filter((v) => v.f.mes === i + 1).map((v) => v.p)
    return { mes: i + 1, unidades: ps.reduce((s, p) => s + unidades(p), 0), pedidos: ps.length, ingresos: ps.reduce((s, p) => s + p.total, 0) }
  })

  // Clientes: se identifican por teléfono (solo dígitos); si no hay, por nombre
  const cl = new Map<string, { nombre: string; telefono: string; pedidos: number; total: number }>()
  for (const { p } of sel) {
    const k = p.cliente.telefono.replace(/\D/g, '') || p.cliente.nombre.toLowerCase()
    const x = cl.get(k) ?? { nombre: p.cliente.nombre, telefono: p.cliente.telefono, pedidos: 0, total: 0 }
    x.pedidos++; x.total += p.total; x.nombre = p.cliente.nombre // conserva el nombre más reciente
    cl.set(k, x)
  }
  const ranking = [...cl.values()].sort((a, b) => b.total - a.total || b.pedidos - a.pedidos)
  const menos = ranking.length ? ranking[ranking.length - 1] : null
  const empatados = menos ? ranking.filter((c) => c.total === menos.total && c.pedidos === menos.pedidos).length - 1 : 0

  const fechas = FECHAS_IMPORTANTES.map((ev) => {
    const ps = sel.filter(({ f }) => Math.abs(dias(f.anio, f.mes, f.dia) - dias(f.anio, ev.mes, ev.dia)) <= VENTANA_DIAS).map((v) => v.p)
    return {
      clave: ev.clave, nombre: ev.nombre, mes: ev.mes, dia: ev.dia, pedidos: ps.length, unidades: ps.reduce((s, p) => s + unidades(p), 0),
      ingresos: ps.reduce((s, p) => s + p.total, 0), top: topProductos(ps, 1)[0]?.nombre ?? null
    }
  })

  return {
    anios, anio, mes,
    anual: topProductos(sel.map((v) => v.p), 10),
    porMes,
    mensual: topProductos(sel.filter((v) => v.f.mes === mes).map((v) => v.p), 10),
    clientes: { total: ranking.length, ranking: ranking.slice(0, 10), mas: ranking[0] ?? null, menos, empatadosMenos: empatados },
    fechas, ventanaDias: VENTANA_DIAS
  }
}
