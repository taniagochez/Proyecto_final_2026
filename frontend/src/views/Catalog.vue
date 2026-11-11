<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiCartPlus, mdiClose, mdiEye, mdiFlower } from '@mdi/js'
import { useCart, useInventory } from '../stores'
import type { Producto } from '../types'

const inv = useInventory(), cart = useCart()
const cat = ref('Todos'), aviso = ref(false), texto = ref('')
const detalle = ref(false)              // true = carta de detalle abierta
const sel = ref<Producto | null>(null)  // producto que se está viendo
const verDetalle = (p: Producto) => { sel.value = p; detalle.value = true }
const cats = computed(() => ['Todos', ...new Set(inv.productos.map((p) => p.categoria))])
const lista = computed(() => inv.productos.filter((p) => cat.value === 'Todos' || p.categoria === cat.value))
const agregar = (p: Producto) => {
  texto.value = cart.add(p) ? `${p.nombre} agregado al carrito` : 'No hay más unidades disponibles'
  aviso.value = true
}
</script>

<template>
  <h1 class="text-h4 mb-1"><v-icon :icon="mdiFlower" color="primary" /> Arreglos para cada ocasión</h1>
  <p class="mb-4 text-medium-emphasis">Elige tu arreglo y programa el retiro en nuestra tienda.</p>
  <v-chip-group v-model="cat" mandatory selected-class="bg-primary" class="mb-4">
    <v-chip v-for="c in cats" :key="c" :value="c" filter>{{ c }}</v-chip>
  </v-chip-group>
  <v-row>
    <v-col v-for="p in lista" :key="p.id" cols="12" sm="6" md="4">
      <v-card height="100%" class="d-flex flex-column">
        <v-img v-if="p.imagen" :src="p.imagen" :alt="p.nombre" height="180" cover class="cursor-pointer" @click="verDetalle(p)" />
        <v-sheet v-else color="surface-variant" class="d-flex align-center justify-center cursor-pointer" height="180" style="font-size: 64px" @click="verDetalle(p)">{{ p.icono }}</v-sheet>
        <v-card-title class="cursor-pointer" @click="verDetalle(p)">{{ p.nombre }}</v-card-title>
        <v-card-text class="flex-grow-1">
          {{ p.descripcion }}
          <div class="mt-3 d-flex ga-2 align-center">
            <v-chip size="small" color="primary">{{ p.categoria }}</v-chip>
            <v-chip size="small" :color="p.disponible ? 'secondary' : 'error'">
              {{ p.disponible ? `Disponible: ${p.disponible}` : 'Agotado' }}
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <span class="text-h6">${{ p.precio.toFixed(2) }}</span><v-spacer />
          <v-btn variant="text" :prepend-icon="mdiEye" @click="verDetalle(p)">Ver</v-btn>
          <v-btn color="primary" :prepend-icon="mdiCartPlus" :disabled="!p.disponible" @click="agregar(p)">Agregar</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
    <!-- Carta de detalle del producto -->
  <v-dialog v-model="detalle" max-width="720">
    <v-card v-if="sel">
      <v-btn :icon="mdiClose" size="small" class="ma-2" style="position: absolute; right: 0; top: 0; z-index: 2" @click="detalle = false" />
      <v-img v-if="sel.imagen" :src="sel.imagen" :alt="sel.nombre" height="420" class="bg-surface-variant" />
      <v-sheet v-else color="surface-variant" class="d-flex align-center justify-center" height="240" style="font-size: 96px">{{ sel.icono }}</v-sheet>
      <v-card-title class="text-h5 pt-4">{{ sel.nombre }}</v-card-title>
      <v-card-text>
        <div class="d-flex ga-2 mb-3">
          <v-chip size="small" color="primary">{{ sel.categoria }}</v-chip>
          <v-chip size="small" :color="sel.disponible ? 'secondary' : 'error'">
            {{ sel.disponible ? `Disponible: ${sel.disponible}` : 'Agotado' }}
          </v-chip>
        </div>
        <p class="text-body-1">{{ sel.descripcion || 'Sin descripción.' }}</p>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <span class="text-h5">${{ sel.precio.toFixed(2) }}</span><v-spacer />
        <v-btn variant="text" @click="detalle = false">Cerrar</v-btn>
        <v-btn color="primary" :prepend-icon="mdiCartPlus" :disabled="!sel.disponible" @click="agregar(sel)">Agregar al carrito</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar v-model="aviso" color="secondary" timeout="2000">{{ texto }}</v-snackbar>
</template>
