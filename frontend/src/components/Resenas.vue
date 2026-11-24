<script setup lang="ts">
// Diálogo de calificaciones de un ramo: promedio, comentarios y formulario para calificar (solo clientes con sesión).
import { computed, ref, watch } from 'vue'
import { api, errMsg } from '../services/api'
import { useAuth } from '../stores'
import type { Calificaciones, Producto } from '../types'

const props = defineProps<{ producto: Producto | null }>()
const abierto = defineModel<boolean>({ default: false })
const emit = defineEmits<{ cambio: [] }>()
const auth = useAuth()

const info = ref<Calificaciones | null>(null)
const estrellas = ref(0), comentario = ref(''), error = ref(''), enviando = ref(false), listo = ref(false)
const esCliente = computed(() => auth.user?.rol === 'Cliente')

async function cargar() {
  if (!props.producto) return
  info.value = null; error.value = ''; listo.value = false
  try {
    info.value = (await api.get<Calificaciones>(`/productos/${props.producto.id}/calificaciones`)).data
    estrellas.value = info.value.mia?.estrellas ?? 0
    comentario.value = info.value.mia?.comentario ?? ''
  } catch (e) { error.value = errMsg(e) }
}
watch(abierto, (v) => { if (v) cargar() })

async function enviar() {
  if (!props.producto || !estrellas.value) return
  enviando.value = true; error.value = ''
  try {
    await api.post(`/productos/${props.producto.id}/calificaciones`, { estrellas: estrellas.value, comentario: comentario.value })
    emit('cambio'); await cargar(); listo.value = true
  } catch (e) { error.value = errMsg(e) }
  finally { enviando.value = false }
}
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-SV', { dateStyle: 'medium' })
</script>

<template>
  <v-dialog v-model="abierto" max-width="520" scrollable>
    <v-card v-if="producto" :title="`Calidad · ${producto.nombre}`">
      <v-card-text>
        <div v-if="info" class="d-flex align-center ga-3 mb-2">
          <span class="text-h4">{{ info.totalCalificaciones ? info.promedio.toFixed(1) : '—' }}</span>
          <div>
            <v-rating :model-value="info.promedio" readonly half-increments density="compact" size="small" color="amber-darken-2" active-color="amber-darken-2" />
            <div class="text-caption">{{ info.totalCalificaciones }} {{ info.totalCalificaciones === 1 ? 'calificación' : 'calificaciones' }}</div>
          </div>
        </div>

        <v-divider class="my-3" />
        <template v-if="esCliente">
          <div class="text-subtitle-2 mb-1">{{ info?.mia ? 'Tu calificación (puedes cambiarla)' : '¿Cómo calificas la calidad de este ramo?' }}</div>
          <v-rating v-model="estrellas" hover color="amber-darken-2" active-color="amber-darken-2" />
          <v-textarea v-model="comentario" label="Comentario (opcional)" counter="300" maxlength="300" rows="2" auto-grow class="mt-2" />
          <v-alert v-if="listo" color="secondary" class="mb-2">¡Gracias por tu calificación!</v-alert>
          <v-btn color="primary" :disabled="!estrellas" :loading="enviando" @click="enviar">{{ info?.mia ? 'Actualizar calificación' : 'Enviar calificación' }}</v-btn>
        </template>
        <v-alert v-else-if="!auth.user" color="info">Para calificar este ramo <router-link to="/login" @click="abierto = false">inicia sesión como cliente</router-link>.</v-alert>
        <v-alert v-else color="info">Solo las cuentas de cliente pueden calificar los ramos.</v-alert>
        <v-alert v-if="error" color="error" class="mt-2">{{ error }}</v-alert>

        <template v-if="info?.resenas.length">
          <v-divider class="my-4" />
          <div class="text-subtitle-2 mb-2">Opiniones</div>
          <div v-for="(r, i) in info.resenas" :key="i" class="mb-3">
            <div class="d-flex align-center ga-2">
              <b>{{ r.nombre }}</b>
              <v-rating :model-value="r.estrellas" readonly density="compact" size="x-small" color="amber-darken-2" active-color="amber-darken-2" />
              <span class="text-caption text-medium-emphasis">{{ fecha(r.fecha) }}</span>
            </div>
            <div v-if="r.comentario">{{ r.comentario }}</div>
          </div>
        </template>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn @click="abierto = false">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
