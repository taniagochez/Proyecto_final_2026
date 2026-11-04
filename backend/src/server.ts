import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { openapi } from './openapi'
import routes from './routes'

const app = express()
app.use(cors(), express.json())
app.get('/api/openapi.json', (_q, res) => res.json(openapi))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'API Yli Gochez' }))
app.use('/api', routes)
app.get('/', (_q, res) => res.redirect('/api/docs'))

const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => console.log(`API lista: http://localhost:${PORT}/api  ·  Swagger: http://localhost:${PORT}/api/docs`))
