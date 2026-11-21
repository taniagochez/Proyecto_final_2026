import axios from 'axios'

// El proxy de Vite (vite.config.ts) redirige /api al backend en http://localhost:3000
export const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('hg_token')
  if (t && !String(c.url ?? '').includes('/auth/login')) c.headers.Authorization = `Bearer ${t}`
  return c
})
api.interceptors.response.use((r) => r, (e) => {
  // Un 401 al iniciar sesión es "credenciales incorrectas": no debe borrar la sesión ni redirigir.
  const esLogin = String(e.config?.url ?? '').includes('/auth/login')
  if (e.response?.status === 401 && !esLogin && localStorage.getItem('hg_token')) {
    localStorage.removeItem('hg_token'); localStorage.removeItem('hg_user'); location.hash = '#/login'
  }
  return Promise.reject(e)
})
export const errMsg = (e: any): string => e?.response?.data?.error ?? 'No se pudo conectar con el servidor'
