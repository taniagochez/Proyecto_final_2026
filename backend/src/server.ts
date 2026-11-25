import 'dotenv/config' // carga backend/.env antes de importar el resto
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import swaggerUi from 'swagger-ui-express'
import { conectarDB, normalizarCorreo, sembrar, sinId, usuarios } from './db'
import { openapi } from './openapi'
import routes from './routes'

const SECRET = process.env.JWT_SECRET || 'hi-gochez-dev-secret' // el mismo que usa routes.ts

const app = express()
app.use(cors(), express.json())

// ---- Swagger protegido con un modal de inicio de sesión dentro de /api/docs ----
// Solo entra un usuario con rol Administrador (usuario = correo, contraseña = la misma de la web).
const COOKIE = 'docs_token'
const intentos = new Map<string, { n: number; hasta: number }>() // freno básico contra fuerza bruta (por IP)
const MAX_INTENTOS = 10, VENTANA_MS = 15 * 60 * 1000

const esAdminDocs = (req: Request) => {
  const c = (req.headers.cookie ?? '').split(';').map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE}=`))
  if (!c) return false
  try { return (jwt.verify(decodeURIComponent(c.slice(COOKIE.length + 1)), SECRET) as { rol?: string; docs?: boolean }).rol === 'Administrador' } catch { return false }
}

app.post('/api/docs/login', async (req, res, next) => {
  try {
  const ip = req.ip ?? 'desconocida', ahora = Date.now(), reg = intentos.get(ip)
  if (reg && reg.hasta > ahora && reg.n >= MAX_INTENTOS) return void res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  const password = String(req.body?.password ?? '')
  const u = await usuarios.findOne({ correo: normalizarCorreo(req.body?.correo) }, sinId)
  if (!u || !bcrypt.compareSync(password, u.passwordHash)) {
    intentos.set(ip, { n: (reg && reg.hasta > ahora ? reg.n : 0) + 1, hasta: ahora + VENTANA_MS })
    return void res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  }
  if (u.rol !== 'Administrador') return void res.status(403).json({ error: 'Solo el Administrador puede ver la documentación' })
  intentos.delete(ip)
  const token = jwt.sign({ correo: u.correo, rol: u.rol, docs: true }, SECRET, { expiresIn: '1h' })
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/api/docs', maxAge: 60 * 60 * 1000 })
  res.json({ ok: true })
  } catch (e) { next(e) }
})

app.post('/api/docs/logout', (_q, res) => { res.clearCookie(COOKIE, { path: '/api/docs' }); res.json({ ok: true }) })

const loginHtml = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Yli Gochez · Acceso</title>
<style>
  *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:rgba(0,0,0,.45)}
  .card{width:min(92vw,400px);background:#fff;border-radius:14px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:in .25s ease}
  @keyframes in{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
  h1{margin:0 0 4px;font-size:20px} p{margin:0 0 18px;color:#555;font-size:14px}
  label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}
  input{width:100%;padding:11px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px} input:focus{outline:2px solid #F4A6C0;border-color:#F4A6C0}
  button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:#F4A6C0;color:#000;font-weight:700;font-size:15px;cursor:pointer} button:disabled{opacity:.6;cursor:wait}
  .err{margin-top:12px;padding:10px;border-radius:8px;background:#fde3e8;color:#9b1c3a;font-size:13px;display:none}
</style></head><body>
<form class="card" id="f" autocomplete="on">
  <h1>🌸 Documentación de la API</h1>
  <p>Acceso solo para el Administrador.</p>
  <label for="c">Correo</label><input id="c" name="username" type="email" required autofocus autocomplete="username" placeholder="admin@hi.com">
  <label for="p">Contraseña</label><input id="p" name="password" type="password" required autocomplete="current-password">
  <div class="err" id="e"></div>
  <button id="b" type="submit">Entrar</button>
</form>
<script>
  const f=document.getElementById('f'),e=document.getElementById('e'),b=document.getElementById('b')
  f.addEventListener('submit',async(ev)=>{
    ev.preventDefault(); e.style.display='none'; b.disabled=true
    try{
      const r=await fetch('/api/docs/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:f.c.value,password:f.p.value})})
      const d=await r.json().catch(()=>({}))
      if(r.ok) location.reload(); else {e.textContent=d.error||'No se pudo iniciar sesión';e.style.display='block'}
    }catch{e.textContent='No se pudo conectar con el servidor';e.style.display='block'}
    b.disabled=false
  })
</script></body></html>`

const soloAdministrador = (req: Request, res: Response, next: NextFunction) => {
  if (esAdminDocs(req)) return next()
  if (req.method === 'GET' && req.accepts('html')) return void res.status(401).type('html').send(loginHtml) // el navegador ve el modal
  res.status(401).send('Acceso restringido: solo el Administrador puede ver la documentación.')
}

app.use('/api/docs', soloAdministrador, swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'API Yli Gochez' }))
app.use('/api', routes)
app.get('/', (_q, res) => res.json({ api: 'Yli Gochez Floristería', estado: 'ok' }))

// Errores no controlados (p. ej. la base de datos no responde): respuesta limpia, sin detalles internos
app.use((err: { type?: string }, _q: Request, res: Response, _n: NextFunction) => {
  if (err?.type === 'entity.parse.failed') return void res.status(400).json({ error: 'JSON inválido' })
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = Number(process.env.PORT) || 3000
conectarDB()
  .then(sembrar)
  .then(() => app.listen(PORT, () => {
    console.log('MongoDB:    conectado')
    console.log(`API lista:  http://localhost:${PORT}/api`)
    console.log(`Swagger:    http://localhost:${PORT}/api/docs  (abre un modal para entrar como Administrador)`)
  }))
  .catch((e) => { console.error(`No se pudo iniciar: ${e.message}`); process.exit(1) })