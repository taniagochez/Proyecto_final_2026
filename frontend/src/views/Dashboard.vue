<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { mdiChartLine } from '@mdi/js'
import { api } from '../services/api'

const d = ref({ ingresos: 0, pedidos: 0, ticketPromedio: 0, insumosBajos: 0, top: [] as { nombre: string; cantidad: number }[] })
onMounted(async () => { d.value = (await api.get('/dashboard')).data })
</script>

<template>
  <h1 class="text-h4 mb-4"><v-icon :icon="mdiChartLine" color="primary" /> Dashboard</h1>
  <v-row>
    <v-col cols="6" md="3"><v-card color="primary" variant="flat" class="pa-4"><div class="text-caption">Ingresos</div><div class="text-h5">${{ d.ingresos.toFixed(2) }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="secondary" variant="flat" class="pa-4"><div class="text-caption">Pedidos</div><div class="text-h5">{{ d.pedidos }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="info" variant="flat" class="pa-4"><div class="text-caption">Ticket promedio</div><div class="text-h5">${{ d.ticketPromedio.toFixed(2) }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="error" variant="flat" class="pa-4"><div class="text-caption">Insumos con stock bajo</div><div class="text-h5">{{ d.insumosBajos }}</div></v-card></v-col>
  </v-row>
  <v-card class="mt-4 pa-4">
    <v-card-title>Productos más vendidos</v-card-title>
    <p v-if="!d.top.length" class="px-4 text-medium-emphasis">Aún no hay ventas registradas.</p>
    <div v-for="t in d.top" :key="t.nombre" class="px-4 py-1">
      {{ t.nombre }} <b>({{ t.cantidad }})</b><v-progress-linear :model-value="(t.cantidad / d.top[0].cantidad) * 100" color="secondary" height="10" rounded />
    </div>
  </v-card>
</template>
