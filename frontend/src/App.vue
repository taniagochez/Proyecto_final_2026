<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiFlower, mdiCartOutline, mdiMinus, mdiLogout, mdiStoreClock, mdiShieldAccount, mdiAccountCog, mdiAccount } from '@mdi/js'
import { useAuth, useCart } from './stores'

const auth = useAuth(), cart = useCart(), router = useRouter()
const drawer = ref(false)
const money = (n: number) => `$${n.toFixed(2)}`
const salir = () => { auth.logout(); router.push('/') }
// Distintivo del tipo de sesión, junto al carrito
const badge = { Administrador: { c: 'secondary', i: mdiShieldAccount }, Encargado: { c: 'warning', i: mdiAccountCog }, Cliente: { c: 'info', i: mdiAccount } } as const
const irCheckout = () => { drawer.value = false; router.push('/checkout') }
</script>

<template>
  <v-app>
    <v-app-bar color="primary" flat>
      <v-app-bar-title class="cursor-pointer" @click="router.push('/')">
        <v-icon :icon="mdiFlower" class="mr-2" />Yli Gochez Floristería y Detalles
      </v-app-bar-title>
      <v-btn to="/" variant="text">Catálogo</v-btn>
      <template v-if="auth.user">
        <v-btn v-if="auth.user.rol !== 'Cliente'" to="/pedidos" variant="text">Pedidos</v-btn>
        <template v-if="auth.user.rol === 'Administrador'">
          <v-btn to="/inventario" variant="text">Inventario</v-btn>
          <v-btn to="/dashboard" variant="text">Dashboard</v-btn>
        </template>
        <v-btn :prepend-icon="mdiLogout" variant="text" @click="salir">Salir</v-btn>
      </template>
      <v-btn v-else to="/login" variant="text">Ingresar</v-btn>
      <v-btn icon variant="text" @click="drawer = true">
        <v-badge :content="cart.count" :model-value="cart.count > 0" color="secondary"><v-icon :icon="mdiCartOutline" /></v-badge>
      </v-btn>
      <v-chip v-if="auth.user" :color="badge[auth.user.rol].c" :prepend-icon="badge[auth.user.rol].i" class="mx-3" label>
        {{ auth.user.rol }}
      </v-chip>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" location="right" temporary width="340">
      <v-list-subheader class="mt-2">Tu carrito</v-list-subheader>
      <v-list v-if="cart.lineas.length">
        <v-list-item v-for="l in cart.lineas" :key="l.p.id" :title="`${l.p.icono} ${l.p.nombre}`" :subtitle="`${l.cantidad} × ${money(l.p.precio)}`">
          <template #append><v-btn :icon="mdiMinus" size="x-small" color="primary" @click="cart.restar(l.p.id)" /></template>
        </v-list-item>
      </v-list>
      <p v-else class="pa-4 text-medium-emphasis">Aún no agregas arreglos.</p>
      <div class="pa-4" v-if="cart.lineas.length">
        <div class="text-h6 mb-3">Total: {{ money(cart.total) }}</div>
        <v-btn block color="secondary" :prepend-icon="mdiStoreClock" @click="irCheckout">Programar retiro</v-btn>
      </div>
    </v-navigation-drawer>

    <v-main class="bg-surface-variant"><v-container><router-view /></v-container></v-main>
  </v-app>
</template>

<style>
.cursor-pointer { cursor: pointer }
a { color: #000; font-weight: 600 }
.urgente { background: #fde3e8 !important }
</style>
