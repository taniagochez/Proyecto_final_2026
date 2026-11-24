<script setup lang="ts">
// 12 columnas (una por mes). Al hacer clic se elige el mes; el mes elegido va resaltado.
import { computed } from 'vue'

const props = defineProps<{ datos: { mes: number; unidades: number; pedidos: number }[]; seleccionado: number }>()
const emit = defineEmits<{ elegir: [mes: number] }>()
const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const W = 600, H = 220, PAD = { t: 22, b: 26, l: 8, r: 8 }
const max = computed(() => Math.max(1, ...props.datos.map((d) => d.unidades)))
const paso = (W - PAD.l - PAD.r) / 12
const cols = computed(() => props.datos.map((d, i) => {
  const h = (d.unidades / max.value) * (H - PAD.t - PAD.b)
  return { ...d, x: PAD.l + i * paso, bw: paso * 0.6, h, y: H - PAD.b - h }
}))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Unidades vendidas por mes" class="w-100" style="max-width: 100%">
    <line :x1="PAD.l" :x2="W - PAD.r" :y1="H - PAD.b" :y2="H - PAD.b" stroke="#D9C9CF" />
    <g v-for="c in cols" :key="c.mes" class="col" @click="emit('elegir', c.mes)">
      <title>{{ nombres[c.mes - 1] }}: {{ c.unidades }} ramos · {{ c.pedidos }} pedidos</title>
      <rect :x="c.x" y="0" :width="paso" :height="H - PAD.b" fill="transparent" />
      <rect v-if="c.unidades" :x="c.x + (paso - c.bw) / 2" :y="c.y" :width="c.bw" :height="c.h" rx="4" :fill="c.mes === seleccionado ? '#C9567F' : '#EBB3C5'" />
      <text v-if="c.unidades && c.mes === seleccionado" :x="c.x + paso / 2" :y="c.y - 6" text-anchor="middle" font-size="12" font-weight="700">{{ c.unidades }}</text>
      <text :x="c.x + paso / 2" :y="H - 8" text-anchor="middle" font-size="12" :font-weight="c.mes === seleccionado ? 700 : 400">{{ nombres[c.mes - 1] }}</text>
    </g>
  </svg>
</template>

<style scoped>
.col { cursor: pointer }
.col:hover rect:nth-child(3) { fill: #D6728F }
text { fill: #000 }
</style>
