<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { mdiChartLine, mdiCrown, mdiAccountArrowDown } from '@mdi/js'
import { api } from '../services/api'
import type { Analitica } from '../types'
import HBars from '../components/charts/HBars.vue'
import MonthColumns from '../components/charts/MonthColumns.vue'

const d = ref({ ingresos: 0, pedidos: 0, ticketPromedio: 0, insumosBajos: 0 })
const a = ref<Analitica | null>(null)
const hoy = new Date()
const anio = ref(hoy.getFullYear()), mes = ref(hoy.getMonth() + 1), cargando = ref(false)
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const mesesItems = meses.map((t, i) => ({ title: t, value: i + 1 }))
const aniosItems = computed(() => [{ title: 'Todos los años', value: 0 }, ...(a.value?.anios ?? [anio.value]).map((x) => ({ title: String(x), value: x }))])
const money = (n: number) => `$${n.toFixed(2)}`
const unid = (n: number) => `${n} ${n === 1 ? 'ramo' : 'ramos'}`
const periodo = computed(() => (anio.value ? String(anio.value) : 'todos los años'))

async function cargar() {
  cargando.value = true
  try { a.value = (await api.get<Analitica>('/dashboard/analitica', { params: { anio: anio.value, mes: mes.value } })).data }
  finally { cargando.value = false }
}
onMounted(async () => { d.value = (await api.get('/dashboard')).data; await cargar() })
watch([anio, mes], cargar)

const anual = computed(() => (a.value?.anual ?? []).map((p) => ({ label: p.nombre, value: p.cantidad, sub: money(p.ingresos) })))
const mensual = computed(() => (a.value?.mensual ?? []).map((p) => ({ label: p.nombre, value: p.cantidad, sub: money(p.ingresos) })))
const ranking = computed(() => (a.value?.clientes.ranking ?? []).map((c) => ({ label: c.nombre, value: c.total, sub: `${c.pedidos} ${c.pedidos === 1 ? 'pedido' : 'pedidos'}` })))
const fechas = computed(() => (a.value?.fechas ?? []).map((f) => ({
  label: `${f.nombre} (${f.dia} ${meses[f.mes - 1].slice(0, 3).toLowerCase()})`, value: f.unidades,
  sub: f.pedidos ? `${f.pedidos} ${f.pedidos === 1 ? 'pedido' : 'pedidos'} · ${money(f.ingresos)}${f.top ? ' · más vendido: ' + f.top : ''}` : 'Sin ventas'
})))
</script>

<template>
  <div class="d-flex align-center mb-4 ga-4 flex-wrap">
    <h1 class="text-h4"><v-icon :icon="mdiChartLine" color="primary" /> Dashboard</h1><v-spacer />
    <v-select v-model="anio" :items="aniosItems" label="Período" density="compact" hide-details variant="outlined" style="max-width: 200px" />
  </div>
  <v-row>
    <v-col cols="6" md="3"><v-card color="primary" variant="flat" class="pa-4"><div class="text-caption">Ingresos</div><div class="text-h5">${{ d.ingresos.toFixed(2) }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="secondary" variant="flat" class="pa-4"><div class="text-caption">Pedidos</div><div class="text-h5">{{ d.pedidos }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="info" variant="flat" class="pa-4"><div class="text-caption">Ticket promedio</div><div class="text-h5">${{ d.ticketPromedio.toFixed(2) }}</div></v-card></v-col>
    <v-col cols="6" md="3"><v-card color="error" variant="flat" class="pa-4"><div class="text-caption">Insumos con stock bajo</div><div class="text-h5">{{ d.insumosBajos }}</div></v-card></v-col>
  </v-row>

  <v-progress-linear v-if="cargando" indeterminate color="primary" class="mt-4" />
  <template v-if="a">
    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <v-card class="pa-4" height="100%">
          <v-card-title>Más vendido · anual</v-card-title>
          <v-card-subtitle>Ramos vendidos por producto en {{ periodo }}</v-card-subtitle>
          <v-card-text><HBars :items="anual" :format="unid" /></v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="pa-4" height="100%">
          <v-card-title class="d-flex align-center ga-4 flex-wrap">
            Más vendido · mensual<v-spacer />
            <v-select v-model="mes" :items="mesesItems" label="Mes" density="compact" hide-details variant="outlined" style="max-width: 170px" />
          </v-card-title>
          <v-card-subtitle>Ramos por mes en {{ periodo }} (toca una columna para elegir el mes)</v-card-subtitle>
          <v-card-text>
            <MonthColumns :datos="a.porMes" :seleccionado="mes" @elegir="mes = $event" />
            <div class="text-subtitle-2 mt-3 mb-1">{{ meses[mes - 1] }}: productos más vendidos</div>
            <HBars :items="mensual" :format="unid" color="#4E9F6E" :empty="`Sin ventas en ${meses[mes - 1].toLowerCase()}.`" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="5">
        <v-card class="pa-4" height="100%">
          <v-card-title>Clientes · {{ periodo }}</v-card-title>
          <v-card-text v-if="a.clientes.mas && a.clientes.menos">
            <v-sheet color="primary" rounded="lg" class="pa-3 mb-3 d-flex align-center ga-3">
              <v-icon :icon="mdiCrown" />
              <div><div class="text-caption">Compra más</div><b>{{ a.clientes.mas.nombre }}</b><div>{{ money(a.clientes.mas.total) }} · {{ a.clientes.mas.pedidos }} {{ a.clientes.mas.pedidos === 1 ? 'pedido' : 'pedidos' }}</div></div>
            </v-sheet>
            <v-sheet color="secondary" rounded="lg" class="pa-3 d-flex align-center ga-3">
              <v-icon :icon="mdiAccountArrowDown" />
              <div>
                <div class="text-caption">Compra menos</div><b>{{ a.clientes.menos.nombre }}</b>
                <div>{{ money(a.clientes.menos.total) }} · {{ a.clientes.menos.pedidos }} {{ a.clientes.menos.pedidos === 1 ? 'pedido' : 'pedidos' }}</div>
                <div v-if="a.clientes.empatadosMenos" class="text-caption">y {{ a.clientes.empatadosMenos }} {{ a.clientes.empatadosMenos === 1 ? 'cliente más' : 'clientes más' }} con el mismo monto</div>
              </div>
            </v-sheet>
            <p class="text-caption text-medium-emphasis mt-3">Se identifica a cada cliente por su teléfono. Total de clientes: {{ a.clientes.total }}.</p>
          </v-card-text>
          <v-card-text v-else class="text-medium-emphasis">Aún no hay ventas en este período.</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <v-card class="pa-4" height="100%">
          <v-card-title>Clientes que más compran</v-card-title>
          <v-card-subtitle>Total gastado, top 10</v-card-subtitle>
          <v-card-text><HBars :items="ranking" :format="money" /></v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-4 mt-4">
      <v-card-title>Fechas importantes · {{ periodo }}</v-card-title>
      <v-card-subtitle>Ramos con retiro en la fecha o ±{{ a.ventanaDias }} {{ a.ventanaDias === 1 ? 'día' : 'días' }}</v-card-subtitle>
      <v-card-text><HBars :items="fechas" :format="unid" color="#D6628A" /></v-card-text>
    </v-card>
  </template>
</template>
