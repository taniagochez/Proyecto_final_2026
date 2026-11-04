<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mdiStoreClock } from '@mdi/js'
import { useOrders } from '../stores'
import type { Estado, Pedido } from '../types'

const orders = useOrders()
const now = ref(Date.now()); let t = 0
onMounted(() => {
  orders.cargar()
  t = window.setInterval(() => { now.value = Date.now(); orders.cargar() }, 30000)
})
onUnmounted(() => clearInterval(t))

const soloHoy = ref(true), search = ref('')
const estados: Estado[] = ['Pendiente', 'Listo para retiro', 'Entregado', 'Cancelado']
const color: Record<Estado, string> = { Pendiente: 'warning', 'Listo para retiro': 'info', Entregado: 'secondary', Cancelado: 'error' }
const headers = [
  { title: 'Retiro', key: 'retiro' }, { title: 'Pedido', key: 'id' }, { title: 'Cliente', key: 'cliente.nombre' },
  { title: 'Total', key: 'total' }, { title: 'Estado', key: 'estado' }, { title: 'Cambiar estado', key: 'acciones', sortable: false }
]
const lista = computed(() =>
  orders.pedidos.filter((p) => !soloHoy.value || new Date(p.retiro).toDateString() === new Date().toDateString())
    .sort((a, b) => +new Date(a.retiro) - +new Date(b.retiro)))
const urgente = (p: Pedido) => p.estado === 'Pendiente' && (+new Date(p.retiro) - now.value) / 60000 < 60
const rowProps = ({ item }: { item: Pedido }) => ({ class: urgente(item) ? 'urgente' : '' })
const hora = (iso: string) => new Date(iso).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <div class="d-flex align-center mb-4 ga-4 flex-wrap">
    <h1 class="text-h4"><v-icon :icon="mdiStoreClock" color="primary" /> Cola de pedidos</h1><v-spacer />
    <v-switch v-model="soloHoy" label="Solo hoy" hide-details color="primary" />
    <v-text-field v-model="search" label="Buscar" density="compact" hide-details style="max-width: 240px" />
  </div>
  <v-card>
    <v-data-table :headers="headers" :items="lista" :search="search" item-value="id" show-expand :row-props="rowProps" no-data-text="No hay pedidos para mostrar">
      <template #item.retiro="{ item }">{{ hora(item.retiro) }}<v-chip v-if="urgente(item)" size="x-small" color="error" class="ml-2">Urgente</v-chip></template>
      <template #item.total="{ item }">${{ item.total.toFixed(2) }}</template>
      <template #item.estado="{ item }"><v-chip :color="color[item.estado]" size="small">{{ item.estado }}</v-chip></template>
      <template #item.acciones="{ item }">
        <v-select :model-value="item.estado" :items="estados" density="compact" hide-details variant="outlined" style="min-width: 190px" @update:model-value="orders.cambiar(item, $event)" />
      </template>
      <template #expanded-row="{ columns, item }">
        <tr><td :colspan="columns.length" class="pa-4 bg-surface-variant">
          <div v-for="i in item.items" :key="i.productoId">{{ i.cantidad }} × {{ i.nombre }}</div>
          <div class="mt-2"><b>Tarjeta:</b> {{ item.mensajeTarjeta || '—' }}</div>
          <div><b>Tel:</b> {{ item.cliente.telefono }} · <b>Pago:</b> {{ item.metodoPago }}</div>
        </td></tr>
      </template>
    </v-data-table>
  </v-card>
</template>
