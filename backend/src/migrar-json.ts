// Migración única: copia los datos de backend/data.json a MongoDB.
// Uso:  npm run migrar                      (no pisa lo que ya exista en MongoDB; se puede repetir sin riesgo)
//       npm run migrar -- --sobrescribir    (reemplaza lo existente con lo del archivo)
//       npm run migrar -- ruta/otro.json    (usa otro archivo)
// Hazlo ANTES de iniciar el servidor por primera vez, para que no se carguen primero los datos de ejemplo.
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Collection } from 'mongodb'
import { calificaciones, cerrarDB, conectarDB, facturas, fijarContador, insumos, movimientos, normalizarCorreo, pedidos, productos, usuarios } from './db'

const archivo = path.resolve(process.argv.slice(2).find((a) => a.endsWith('.json')) ?? path.join(__dirname, '..', 'data.json'))
const sobrescribir = process.argv.includes('--sobrescribir')

async function volcar(nombre: string, col: Collection<any>, docs: any[], clave: string) {
  if (!docs.length) return console.log(`  ${nombre.padEnd(15)} 0 en el archivo`)
  const r = await col.bulkWrite(docs.map((d) => ({
    ...(sobrescribir
      ? { replaceOne: { filter: { [clave]: d[clave] }, replacement: d, upsert: true } }
      : { updateOne: { filter: { [clave]: d[clave] }, update: { $setOnInsert: d }, upsert: true } })
  })) as any)
  console.log(`  ${nombre.padEnd(15)} ${docs.length} en el archivo → ${r.upsertedCount} nuevos${sobrescribir ? `, ${r.modifiedCount} reemplazados` : `, ${docs.length - r.upsertedCount} ya existían`}`)
}
/** Mayor número usado en ids como "P-0007" (para que los pedidos nuevos sigan la numeración). */
const maxNumero = (ids: string[], prefijo: string) => Math.max(0, ...ids.filter((i) => i.startsWith(prefijo)).map((i) => parseInt(i.slice(prefijo.length), 10) || 0))

async function main() {
  if (!fs.existsSync(archivo)) throw new Error(`No encontré ${archivo}`)
  const d = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  console.log(`Migrando ${archivo}${sobrescribir ? ' (modo sobrescribir)' : ''} ...`)
  await conectarDB()
  await volcar('usuarios', usuarios, (d.usuarios ?? []).map((u: any) => ({ ...u, correo: normalizarCorreo(u.correo) })), 'correo')
  await volcar('insumos', insumos, d.insumos ?? [], 'id')
  await volcar('productos', productos, d.productos ?? [], 'id')
  await volcar('pedidos', pedidos, d.pedidos ?? [], 'id')
  await volcar('facturas', facturas, d.facturas ?? [], 'id')
  await volcar('movimientos', movimientos, d.movimientos ?? [], 'id')
  await volcar('calificaciones', calificaciones, d.calificaciones ?? [], 'id')
  await fijarContador('pedidos', maxNumero((d.pedidos ?? []).map((p: any) => p.id), 'P-'))
  await fijarContador('facturas', maxNumero((d.facturas ?? []).map((f: any) => f.id), 'F-'))
  console.log('\nListo. Cuando confirmes que todo se ve bien en la app, guarda una copia de data.json fuera del proyecto y bórralo del repositorio/carpeta.')
}
main().catch((e) => { console.error(`Falló la migración: ${e.message}`); process.exitCode = 1 }).finally(cerrarDB)