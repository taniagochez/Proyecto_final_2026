const antes = process.env.MONGODB_URI
require('dotenv').config()
const { MongoClient } = require('mongodb')

console.log('¿Ya existía MONGODB_URI en tu sistema antes del .env?', antes ? 'SÍ (se usa esa y se ignora el .env)' : 'no')
const u = process.env.MONGODB_URI || ''
const m = u.match(/^mongodb(?:\+srv)?:\/\/([^:]+):(.*)@([^@]+)$/)
if (!m) { console.log('Formato raro:', u.replace(/:[^:@]*@/, ':***@')); process.exit() }
console.log('usuario:', m[1])
console.log('host:', m[3])
console.log('largo de la contraseña:', m[2].length)
console.log('tiene símbolos:', /[^A-Za-z0-9]/.test(m[2]), '| tiene < o >:', /[<>]/.test(m[2]))

const c = new MongoClient(u, { serverSelectionTimeoutMS: 8000 })
c.connect().then(() => console.log('CONECTÓ ✔')).catch((e) => console.log('FALLÓ:', e.message)).finally(() => c.close())