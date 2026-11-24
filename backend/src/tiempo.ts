// Utilidades de fecha en la zona horaria de la tienda (El Salvador, UTC-6, sin horario de verano).
// Así los reportes y el límite por hora no dependen de la zona horaria del servidor.
const TZ = 'America/El_Salvador'
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })

export interface FechaLocal { anio: number; mes: number; dia: number; hora: number }
export function fechaLocal(d: Date | string | number): FechaLocal {
  const o: Record<string, number> = {}
  for (const p of fmt.formatToParts(new Date(d))) if (p.type !== 'literal') o[p.type] = Number(p.value)
  return { anio: o.year, mes: o.month, dia: o.day, hora: o.hour }
}
const dos = (n: number) => String(n).padStart(2, '0')
/** 'YYYY-MM-DD' en hora local de la tienda. */
export const diaLocal = (d: Date | string | number) => { const f = fechaLocal(d); return `${f.anio}-${dos(f.mes)}-${dos(f.dia)}` }
/** Franja horaria de una fecha: 'YYYY-MM-DDTHH'. Dos retiros en la misma hora comparten clave. */
export const franjaHora = (d: Date | string | number) => { const f = fechaLocal(d); return `${diaLocal(d)}T${dos(f.hora)}` }
