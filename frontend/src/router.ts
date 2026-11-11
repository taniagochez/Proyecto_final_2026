import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from './stores'
import type { Rol } from './types'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./views/Catalog.vue') },
    { path: '/checkout', component: () => import('./views/Checkout.vue') },
    { path: '/login', component: () => import('./views/Login.vue') },
    { path: '/pedidos', component: () => import('./views/Orders.vue'), meta: { roles: ['Administrador', 'Encargado'] } },
    { path: '/inventario', component: () => import('./views/Inventory.vue'), meta: { roles: ['Administrador'] } },
    { path: '/productos/nuevo', component: () => import('./views/ProductForm.vue'), meta: { roles: ['Administrador'] } },
    { path: '/dashboard', component: () => import('./views/Dashboard.vue'), meta: { roles: ['Administrador'] } }
  ]
})

// Guardias de navegación por rol
router.beforeEach((to) => {
  const roles = to.meta.roles as Rol[] | undefined
  if (!roles) return true
  const user = useAuth().user
  return user && roles.includes(user.rol) ? true : '/login'
})
export default router
