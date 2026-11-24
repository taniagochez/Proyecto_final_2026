// Datos de demostración (opcional): agrega pedidos y calificaciones de 2025 y 2026 para ver los gráficos del dashboard.
// Uso: detén el servidor y ejecuta `npm run demo-data`. No modifica stock ni inventario. Los pedidos llevan id "D-xxxx".
import { db, persist } from './db'

if (db.pedidos.some((p) => p.id.startsWith('D-'))) { console.log('Los datos de demostración ya existen. Borra backend/data.json para reiniciar.'); process.exit(0) }
let semilla = 42
const rnd = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296)
const elegir = <T>(l: T[]) => l[Math.floor(rnd() * l.length)]
const clientes = [['Ana Pérez', '7000-1111'], ['Carlos Mejía', '7000-2222'], ['María López', '7000-3333'], ['José Hernández', '7000-4444'], ['Lucía Ramos', '7000-5555'], ['Pedro Ortiz', '7000-6666'], ['Sofía Cruz', '7000-7777'], ['Daniel Rivas', '7000-8888']]
const pesos = [5, 3, 2, 2, 1, 1, 1, 1] // Ana compra mucho; los últimos, poco
const fechasClave = ['02-14', '03-21', '05-10', '06-17', '08-01', '10-03', '11-02', '12-25']
let n = 0
for (const anio of [2025, 2026]) {
  const total = 70
  for (let k = 0; k < total; k++) {
    const especial = rnd() < 0.4
    let mes: number, dia: number
    if (especial) { const [m, d] = elegir(fechasClave).split('-').map(Number); mes = m; dia = d + Math.floor(rnd() * 3) - 1 }
    else { mes = 1 + Math.floor(rnd() * 12); dia = 1 + Math.floor(rnd() * 28) }
    if (anio === 2026 && (mes > 11 || (mes === 11 && dia > 23))) continue
    const bolsa = clientes.flatMap((c, i) => Array(pesos[i]).fill(c))
    const [nombre, telefono] = elegir(bolsa)
    const items = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => { const p = elegir(db.productos); return { productoId: p.id, nombre: p.nombre, cantidad: 1 + Math.floor(rnd() * 3), precio: p.precio } })
    const retiro = new Date(Date.UTC(anio, mes - 1, dia, 15 + Math.floor(rnd() * 8))) // 9:00 a 16:00 hora local
    db.pedidos.push({ id: 'D-' + String(++n).padStart(4, '0'), cliente: { nombre, telefono }, retiro: retiro.toISOString(), estado: 'Entregado', items, total: items.reduce((s, i) => s + i.precio * i.cantidad, 0), mensajeTarjeta: '', metodoPago: 'Efectivo al retirar', creado: retiro.toISOString() })
  }
}
const comentarios = ['Llegó fresquísimo', 'Muy bonito, tal cual la foto', 'Duró más de una semana', 'Bueno, pero esperaba más flores', 'Hermoso detalle']
for (const p of db.productos) for (const [i, [nombre]] of clientes.slice(0, 4).entries())
  db.calificaciones.push({ id: `d${p.id}${i}`, productoId: p.id, correo: `demo${i}@hi.com`, nombre, estrellas: 3 + Math.floor(rnd() * 3), comentario: elegir(comentarios), fecha: new Date().toISOString() })
persist()
console.log(`Listo: ${n} pedidos y ${db.productos.length * 4} calificaciones de demostración.`)
