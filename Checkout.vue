<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { mdiCheckCircle } from '@mdi/js'
import { useAuth, useCart, useOrders } from '../stores'

const cart = useCart(), orders = useOrders(), auth = useAuth()
const step = ref(1), nombre = ref(auth.user?.rol === 'Cliente' ? auth.user.nombre : ''), tel = ref('')
const msg = ref(''), pago = ref('Efectivo al retirar'), error = ref(''), doneId = ref('')
const horas = Array.from({ length: 10 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`)

// Reloj reactivo: se actualiza cada 30 s para que las horas pasadas se bloqueen solas
const ahora = ref(new Date())
let reloj: ReturnType<typeof setInterval>
onMounted(() => { reloj = setInterval(() => { ahora.value = new Date() }, 30_000) })
onUnmounted(() => clearInterval(reloj))

const inicioDia = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
// Una hora está disponible solo si es posterior al momento actual (ej.: a las 11:00 a. m. solo desde las 12:00)
const disponible = (d: Date, h: string) => {
  const x = new Date(d); const [hh, mm] = h.split(':').map(Number); x.setHours(hh, mm, 0, 0)
  return x.getTime() > ahora.value.getTime()
}
// Si ya no quedan horas hoy, el primer día permitido es mañana
const minFecha = computed(() => {
  const hoy = inicioDia(ahora.value)
  if (horas.some(h => disponible(hoy, h))) return hoy
  const m = new Date(hoy); m.setDate(m.getDate() + 1); return m
})
const fecha = ref<Date>(new Date(minFecha.value))
const hora = ref('')
const horasItems = computed(() => horas.map(h => ({ title: h, value: h, props: { disabled: !disponible(fecha.value, h) } })))

// Mantiene fecha y hora siempre válidas (también cuando pasa el tiempo con la pantalla abierta)
watch([fecha, ahora], () => {
  if (inicioDia(fecha.value) < minFecha.value) fecha.value = new Date(minFecha.value)
  if (!hora.value || !disponible(fecha.value, hora.value)) hora.value = horas.find(h => disponible(fecha.value, h)) ?? ''
}, { immediate: true })
const telOk = (v: string) => /^[\d\s+-]{8,}$/.test(v) || 'Teléfono inválido'
const retiro = computed(() => {
  const d = new Date(fecha.value); const [h, m] = hora.value.split(':').map(Number); d.setHours(h, m, 0, 0); return d
})
const futuro = computed(() => retiro.value.getTime() > Date.now())
const paso1 = computed(() => !!nombre.value.trim() && telOk(tel.value) === true)
const fmt = (d: Date) => d.toLocaleString('es-SV', { dateStyle: 'full', timeStyle: 'short' })

async function confirmar() {
  const r = await orders.crear({
    cliente: { nombre: nombre.value.trim(), telefono: tel.value }, retiro: retiro.value.toISOString(),
    mensajeTarjeta: msg.value, metodoPago: pago.value, lineas: cart.lineas
  })
  if (!r.ok) { error.value = r.error; return }
  doneId.value = r.id; cart.vaciar()
}
</script>

<template>
  <v-card v-if="doneId" class="pa-8 text-center">
    <v-icon :icon="mdiCheckCircle" color="secondary" size="72" />
    <h2 class="text-h5 my-2">¡Pedido {{ doneId }} confirmado!</h2>
    <p>Te esperamos el {{ fmt(retiro) }} en nuestra tienda.</p>
    <v-btn class="mt-4" color="primary" to="/">Volver al catálogo</v-btn>
  </v-card>

  <v-alert v-else-if="!cart.lineas.length" color="primary" variant="flat">
    Tu carrito está vacío. <router-link to="/">Ir al catálogo</router-link>
  </v-alert>

  <v-stepper v-else v-model="step" :items="['Contacto', 'Retiro', 'Tarjeta y pago', 'Resumen']" hide-actions>
    <template #item.1>
      <v-text-field v-model="nombre" label="Nombre completo" :rules="[(v: string) => !!v.trim() || 'Requerido']" />
      <v-text-field v-model="tel" label="Teléfono" :rules="[telOk]" />
      <v-btn color="primary" :disabled="!paso1" @click="step = 2">Siguiente</v-btn>
    </template>
    <template #item.2>
      <v-row>
        <v-col cols="12" md="6"><v-date-picker v-model="fecha" :min="minFecha" hide-header color="primary" width="100%" /></v-col>
        <v-col cols="12" md="6">
          <v-select v-model="hora" :items="horasItems" label="Hora de retiro" />
          <v-alert v-if="!futuro" type="warning" variant="flat">La fecha y hora deben ser posteriores a la actual.</v-alert>
        </v-col>
      </v-row>
      <v-btn variant="text" @click="step = 1">Atrás</v-btn>
      <v-btn color="primary" :disabled="!futuro" @click="step = 3">Siguiente</v-btn>
    </template>
    <template #item.3>
      <v-textarea v-model="msg" label="Mensaje para la tarjeta (opcional)" counter="200" maxlength="200" rows="3" />
      <v-radio-group v-model="pago" label="Método de pago">
        <v-radio v-for="m in ['Efectivo al retirar', 'Transferencia', 'POS']" :key="m" :label="m" :value="m" />
      </v-radio-group>
      <v-btn variant="text" @click="step = 2">Atrás</v-btn>
      <v-btn color="primary" @click="step = 4">Siguiente</v-btn>
    </template>
    <template #item.4>
      <v-list density="compact">
        <v-list-item v-for="l in cart.lineas" :key="l.p.id" :title="`${l.cantidad} × ${l.p.nombre}`" :subtitle="`$${(l.p.precio * l.cantidad).toFixed(2)}`" />
      </v-list>
      <p><b>Cliente:</b> {{ nombre }} · {{ tel }}</p>
      <p><b>Retiro:</b> {{ fmt(retiro) }}</p>
      <p><b>Pago:</b> {{ pago }}</p>
      <p v-if="msg"><b>Tarjeta:</b> {{ msg }}</p>
      <p class="text-h6 my-3">Total: ${{ cart.total.toFixed(2) }}</p>
      <v-alert v-if="error" type="error" variant="flat" class="mb-3">{{ error }} <router-link to="/">Volver al catálogo</router-link></v-alert>
      <v-btn variant="text" @click="step = 3">Atrás</v-btn>
      <v-btn color="secondary" @click="confirmar">Confirmar pedido</v-btn>
    </template>
  </v-stepper>
</template>
