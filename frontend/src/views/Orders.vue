<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mdiStoreClock, mdiReceiptText, mdiPrinter } from '@mdi/js'
import { useOrders } from '../stores'
import type { Estado, Factura, Pedido } from '../types'

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
  { title: 'Total', key: 'total' }, { title: 'Estado', key: 'estado' }, { title: 'Cambiar estado', key: 'acciones', sortable: false }, { title: 'Factura', key: 'factura', sortable: false }
]
const lista = computed(() =>
  orders.pedidos.filter((p) => !soloHoy.value || new Date(p.retiro).toDateString() === new Date().toDateString())
    .sort((a, b) => +new Date(a.retiro) - +new Date(b.retiro)))
const urgente = (p: Pedido) => p.estado === 'Pendiente' && (+new Date(p.retiro) - now.value) / 60000 < 60
const rowProps = ({ item }: { item: Pedido }) => ({ class: urgente(item) ? 'urgente' : '' })
const hora = (iso: string) => new Date(iso).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })

// ---- Facturación (solo pedidos Entregados; el backend lo valida y restringe a Administrador/Encargado) ----
const factura = ref<Factura | null>(null), dialogo = ref(false), ocupado = ref<string | null>(null)
const aviso = ref({ show: false, text: '', color: 'success' })
const notificar = (text: string, color = 'success') => (aviso.value = { show: true, text, color })
const money = (n: number) => `$${n.toFixed(2)}`
const cambiarEstado = async (p: Pedido, e: Estado) => {
  const r = await orders.cambiar(p, e)
  if (!r.ok) { notificar(r.error, 'error'); await orders.cargar() }
}
const generar = async (p: Pedido) => {
  ocupado.value = p.id
  const r = await orders.facturar(p)
  ocupado.value = null
  if (!r.ok) return notificar(r.error, 'error')
  factura.value = r.factura; dialogo.value = true; notificar(`Factura ${r.factura.id} generada`)
}
const ver = async (p: Pedido) => {
  if (!p.facturaId) return
  ocupado.value = p.id
  const r = await orders.verFactura(p.facturaId)
  ocupado.value = null
  if (!r.ok) return notificar(r.error, 'error')
  factura.value = r.factura; dialogo.value = true
}
const imprimir = () => {
  const f = factura.value; if (!f) return
  const w = window.open('', '_blank', 'width=720,height=900'); if (!w) return notificar('El navegador bloqueó la ventana de impresión', 'error')
  const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  w.document.write(`<html><head><title>Factura ${f.id}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#222}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}td.n,th.n{text-align:right}h1{margin:0}</style></head><body>
  <h1>Yli Gochez Floristería y Detalles</h1><p>Factura <b>${f.id}</b> · Pedido ${f.pedidoId}<br>Fecha: ${hora(f.fecha)}</p>
  <p><b>Cliente:</b> ${esc(f.cliente.nombre)} · ${esc(f.cliente.telefono)}<br><b>Pago:</b> ${esc(f.metodoPago)}</p>
  <table><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Subtotal</th></tr>
  ${f.items.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="n">${i.cantidad}</td><td class="n">${money(i.precio)}</td><td class="n">${money(i.precio * i.cantidad)}</td></tr>`).join('')}
  <tr><td colspan="3" class="n"><b>Total</b></td><td class="n"><b>${money(f.total)}</b></td></tr></table>
  <p>Emitida por: ${esc(f.emitidaPor.nombre)} (${f.emitidaPor.rol})</p></body></html>`)
  w.document.close(); w.focus(); w.print()
}
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
        <v-select :model-value="item.estado" :items="estados" density="compact" hide-details variant="outlined" style="min-width: 190px" @update:model-value="cambiarEstado(item, $event)" />
      </template>
      <template #item.factura="{ item }">
        <v-btn v-if="item.facturaId" size="small" variant="tonal" color="secondary" :prepend-icon="mdiReceiptText" :loading="ocupado === item.id" @click="ver(item)">Ver {{ item.facturaId }}</v-btn>
        <v-btn v-else-if="item.estado === 'Entregado'" size="small" color="primary" :prepend-icon="mdiReceiptText" :loading="ocupado === item.id" @click="generar(item)">Generar factura</v-btn>
        <span v-else class="text-medium-emphasis text-caption">Disponible al entregar</span>
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

  <v-dialog v-model="dialogo" max-width="560">
    <v-card v-if="factura" :title="`Factura ${factura.id}`" :subtitle="`Pedido ${factura.pedidoId} · ${hora(factura.fecha)}`">
      <v-card-text>
        <div><b>Cliente:</b> {{ factura.cliente.nombre }} · {{ factura.cliente.telefono }}</div>
        <div class="mb-3"><b>Pago:</b> {{ factura.metodoPago }}</div>
        <v-table density="compact">
          <thead><tr><th>Producto</th><th class="text-right">Cant.</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th></tr></thead>
          <tbody>
            <tr v-for="i in factura.items" :key="i.productoId"><td>{{ i.nombre }}</td><td class="text-right">{{ i.cantidad }}</td><td class="text-right">{{ money(i.precio) }}</td><td class="text-right">{{ money(i.precio * i.cantidad) }}</td></tr>
          </tbody>
        </v-table>
        <div class="text-h6 text-right mt-3">Total: {{ money(factura.total) }}</div>
        <div class="text-caption text-medium-emphasis">Emitida por {{ factura.emitidaPor.nombre }} ({{ factura.emitidaPor.rol }})</div>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn :prepend-icon="mdiPrinter" color="primary" @click="imprimir">Imprimir</v-btn><v-btn @click="dialogo = false">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar v-model="aviso.show" :color="aviso.color" timeout="3500">{{ aviso.text }}</v-snackbar>
</template>
