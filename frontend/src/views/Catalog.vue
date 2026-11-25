<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiCartPlus, mdiFlower, mdiStarOutline } from '@mdi/js'
import { useCart, useInventory } from '../stores'
import type { Producto } from '../types'
import Resenas from '../components/Resenas.vue'

const inv = useInventory(), cart = useCart()
const cat = ref('Todos'), aviso = ref(false), texto = ref('')
const calificando = ref<Producto | null>(null), dialogo = ref(false)
const calificar = (p: Producto) => { calificando.value = p; dialogo.value = true }
const visor = ref(false), foto = ref<Producto | null>(null)
const verFoto = (p: Producto) => { foto.value = p; visor.value = true }
const agregarDesdeVisor = () => { if (foto.value) { agregar(foto.value); visor.value = false } }
const calificarDesdeVisor = () => { if (foto.value) { visor.value = false; calificar(foto.value) } }
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
       <v-img v-if="p.imagen" :src="p.imagen" :alt="p.nombre" height="180" cover class="cursor-pointer" @click="verFoto(p)" />
        <v-sheet v-else color="surface-variant" class="d-flex align-center justify-center" height="180" style="font-size: 64px">{{ p.icono }}</v-sheet>
        <v-card-title>{{ p.nombre }}</v-card-title>
        <div class="px-4 d-flex align-center ga-1 cursor-pointer" role="button" :aria-label="`Ver calificaciones de ${p.nombre}`" @click="calificar(p)">
          <v-rating :model-value="p.promedio" readonly half-increments density="compact" size="small" color="amber-darken-2" active-color="amber-darken-2" />
          <span class="text-caption">{{ p.totalCalificaciones ? `${p.promedio.toFixed(1)} (${p.totalCalificaciones})` : 'Sin calificaciones' }}</span>
        </div>
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
          <v-btn color="primary" :prepend-icon="mdiCartPlus" :disabled="!p.disponible" @click="agregar(p)">Agregar</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-dialog v-model="visor" max-width="560">
  <v-card v-if="foto">
    <v-img :src="foto.imagen" :alt="foto.nombre" max-height="75vh" class="cursor-pointer" @click="visor = false" />
    <v-card-title>{{ foto.nombre }}</v-card-title>
    <v-card-text>{{ foto.descripcion }}</v-card-text>
    <v-card-actions class="px-4 pb-4">
      <span class="text-h6">${{ foto.precio.toFixed(2) }}</span><v-spacer />
      <v-btn variant="text" :prepend-icon="mdiStarOutline" @click="calificarDesdeVisor">Calificar</v-btn>
      <v-btn color="primary" :prepend-icon="mdiCartPlus" :disabled="!foto.disponible" @click="agregarDesdeVisor">Agregar</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
  <Resenas v-model="dialogo" :producto="calificando" @cambio="inv.cargarProductos()" />
  <v-snackbar v-model="aviso" color="secondary" timeout="2000">{{ texto }}</v-snackbar>
</template>
