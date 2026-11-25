import 'dotenv/config' // carga backend/.env antes de importar el resto
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import swaggerUi from 'swagger-ui-express'
import { db } from './db'
import { openapi } from './openapi'
import routes from './routes'

const app = express()
app.use(cors(), express.json())

// ---- Swagger protegido: el navegador muestra su cuadro de usuario/contraseña (Basic Auth) ----
// Solo entra un usuario con rol Administrador. Usuario = correo, contraseña = la misma de la web.
const intentos = new Map<string, { n: number; hasta: number }>() // freno básico contra fuerza bruta (por IP)
const MAX_INTENTOS = 10, VENTANA_MS = 15 * 60 * 1000

const pedirCredenciales = (res: Response, msg: string, code = 401) => {
  res.set('WWW-Authenticate', 'Basic realm="API Yli Gochez (solo Administrador)", charset="UTF-8"')
  return void res.status(code).send(msg)
}

const soloAdministrador = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip ?? 'desconocida', ahora = Date.now()
  const reg = intentos.get(ip)
  if (reg && reg.hasta > ahora && reg.n >= MAX_INTENTOS) return void res.status(429).send('Demasiados intentos. Espera unos minutos.')

  const [esquema, codificado] = (req.headers.authorization ?? '').split(' ')
  if (esquema === 'Basic' && codificado) {
    const texto = Buffer.from(codificado, 'base64').toString('utf8')
    const i = texto.indexOf(':')
    const correo = texto.slice(0, i).trim().toLowerCase(), password = texto.slice(i + 1)
    const u = i > 0 ? db.usuarios.find((x) => x.correo.toLowerCase() === correo) : undefined
    if (u && u.rol === 'Administrador' && bcrypt.compareSync(password, u.passwordHash)) {
      intentos.delete(ip)
      return next()
    }
    // credenciales incorrectas (o usuario que no es Administrador): cuenta como intento fallido
    intentos.set(ip, { n: (reg && reg.hasta > ahora ? reg.n : 0) + 1, hasta: ahora + VENTANA_MS })
  }
  pedirCredenciales(res, 'Acceso restringido: solo el Administrador puede ver la documentación.')
}

app.use('/api/docs', soloAdministrador, swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'API Yli Gochez' }))
app.use('/api', routes)
app.get('/', (_q, res) => res.json({ api: 'Yli Gochez Floristería', estado: 'ok' }))

const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => {
  console.log(`API lista:  http://localhost:${PORT}/api`)
  console.log(`Swagger:    http://localhost:${PORT}/api/docs  (pide usuario y contraseña de Administrador)`)
})