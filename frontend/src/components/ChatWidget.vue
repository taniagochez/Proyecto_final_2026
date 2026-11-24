<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { mdiCartPlus, mdiChatProcessingOutline, mdiClose, mdiDeleteOutline, mdiFlower, mdiSend } from '@mdi/js'
import { api, errMsg } from '../services/api'
import { useCart, useInventory } from '../stores'
import type { Producto } from '../types'

interface Msg { role: 'user' | 'assistant'; content: string; productos?: string[]; error?: boolean }

const inv = useInventory(), cart = useCart()
const SALUDO: Msg = { role: 'assistant', content: '¡Hola! Soy Flor 🌸, la asistente de Yli Gochez. Cuéntame para qué ocasión buscas flores o pregúntame lo que necesites sobre la tienda.' }
const SUGERENCIAS = ['Busco un regalo de aniversario', 'Algo bonito por menos de $25', '¿Cómo funciona el retiro?', '¿Cómo cuido mis flores?']

const abierto = ref(false), cargando = ref(false), texto = ref(''), aviso = ref(false), avisoTxt = ref('')
const mensajes = ref<Msg[]>(JSON.parse(sessionStorage.getItem('hg_chat') || 'null') ?? [SALUDO])
const caja = ref<HTMLElement | null>(null)
const soloSaludo = computed(() => mensajes.value.length === 1)

const bajar = () => nextTick(() => { if (caja.value) caja.value.scrollTop = caja.value.scrollHeight })
watch(mensajes, () => { sessionStorage.setItem('hg_chat', JSON.stringify(mensajes.value)); bajar() }, { deep: true })
watch(abierto, (v) => v && bajar())
watch(cargando, bajar)

const producto = (id: string): Producto | undefined => inv.productos.find((p) => p.id === id)

async function enviar(t = texto.value) {
  t = t.trim()
  if (!t || cargando.value) return
  texto.value = ''
  mensajes.value.push({ role: 'user', content: t })
  cargando.value = true
  try {
    // Solo se envían rol y contenido de los mensajes normales (no los de error)
    const historial = mensajes.value.filter((m) => !m.error).map(({ role, content }) => ({ role, content }))
    const { data } = await api.post('/chat', { messages: historial }, { timeout: 40000 })
    await inv.cargarProductos().catch(() => {}) // disponibilidad al día para las tarjetas
    mensajes.value.push({ role: 'assistant', content: data.reply, productos: data.productos })
  } catch (e) {
    mensajes.value.push({ role: 'assistant', content: errMsg(e), error: true })
  } finally { cargando.value = false }
}

function agregar(p: Producto) {
  avisoTxt.value = cart.add(p) ? `${p.nombre} agregado al carrito` : 'No hay más unidades disponibles'
  aviso.value = true
}
const limpiar = () => { mensajes.value = [SALUDO] }
</script>

<template>
  <v-btn v-if="!abierto" class="chat-fab" color="secondary" size="large" icon aria-label="Abrir asistente virtual" elevation="6" @click="abierto = true">
    <v-icon :icon="mdiChatProcessingOutline" size="28" />
  </v-btn>

  <v-card v-else class="chat-panel d-flex flex-column" elevation="8" role="dialog" aria-label="Asistente virtual">
    <v-toolbar color="primary" density="comfortable" flat>
      <v-icon :icon="mdiFlower" class="ml-4 mr-2" />
      <v-toolbar-title class="text-subtitle-1">Flor · Asistente virtual</v-toolbar-title>
      <v-btn :icon="mdiDeleteOutline" variant="text" aria-label="Borrar conversación" :disabled="soloSaludo || cargando" @click="limpiar" />
      <v-btn :icon="mdiClose" variant="text" aria-label="Cerrar asistente" @click="abierto = false" />
    </v-toolbar>

    <div ref="caja" class="chat-mensajes flex-grow-1 pa-3">
      <div v-for="(m, i) in mensajes" :key="i" class="mb-3 d-flex flex-column" :class="m.role === 'user' ? 'align-end' : 'align-start'">
        <div class="burbuja" :class="[m.role === 'user' ? 'bg-primary' : m.error ? 'bg-error' : 'bg-surface-variant']">{{ m.content }}</div>

        <v-card v-for="id in m.productos ?? []" :key="id" v-show="producto(id)" class="mt-2 tarjeta" variant="outlined" rounded="lg" elevation="0">
          <div v-if="producto(id)" class="d-flex align-center pa-2 ga-2">
            <v-avatar rounded size="52">
              <v-img v-if="producto(id)!.imagen" :src="producto(id)!.imagen" cover />
              <span v-else>{{ producto(id)!.icono }}</span>
            </v-avatar>
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-body-2 font-weight-bold text-truncate">{{ producto(id)!.nombre }}</div>
              <div class="text-caption">${{ producto(id)!.precio.toFixed(2) }} · {{ producto(id)!.disponible ? `Disp.: ${producto(id)!.disponible}` : 'Agotado' }}</div>
            </div>
            <v-btn size="small" color="primary" :icon="mdiCartPlus" :disabled="!producto(id)!.disponible" :aria-label="`Agregar ${producto(id)!.nombre} al carrito`" @click="agregar(producto(id)!)" />
          </div>
        </v-card>
      </div>

      <div v-if="soloSaludo" class="d-flex flex-wrap ga-2 mb-3">
        <v-chip v-for="s in SUGERENCIAS" :key="s" size="small" color="primary" variant="outlined" class="cursor-pointer" @click="enviar(s)">{{ s }}</v-chip>
      </div>

      <div v-if="cargando" class="burbuja bg-surface-variant d-inline-flex align-center ga-2">
        <v-progress-circular indeterminate size="16" width="2" color="primary" /> Flor está escribiendo…
      </div>
    </div>

    <v-divider />
    <div class="d-flex align-center pa-2 ga-1">
      <v-text-field v-model="texto" placeholder="Escribe tu mensaje…" density="compact" variant="outlined" hide-details rounded="xl" maxlength="1000" autocomplete="off"
        :disabled="cargando" aria-label="Mensaje para el asistente" @keydown.enter.prevent="enviar()" />
      <v-btn color="primary" :icon="mdiSend" :disabled="!texto.trim() || cargando" aria-label="Enviar mensaje" @click="enviar()" />
    </div>
    <v-snackbar v-model="aviso" color="secondary" timeout="2000" location="top">{{ avisoTxt }}</v-snackbar>
  </v-card>
</template>

<style scoped>
.chat-fab { position: fixed; right: 24px; bottom: 24px; z-index: 2000 }
.chat-panel { position: fixed; right: 24px; bottom: 24px; z-index: 2000; width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 48px); overflow: hidden }
.chat-mensajes { overflow-y: auto; min-height: 0 }
.burbuja { max-width: 85%; padding: 8px 14px; border-radius: 18px; white-space: pre-wrap; word-break: break-word; font-size: 0.9rem; line-height: 1.4 }
.tarjeta { width: 85%; background: #fff }
@media (max-width: 480px) {
  .chat-panel { right: 16px; bottom: 16px; height: calc(100vh - 32px) }
  .chat-fab { right: 16px; bottom: 16px }
}
</style>
