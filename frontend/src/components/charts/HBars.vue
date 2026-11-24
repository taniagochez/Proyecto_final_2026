<script setup lang="ts">
// Barras horizontales simples (sin librerías): una fila por elemento, ordenadas como se reciban.
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  items: { label: string; value: number; sub?: string }[]
  format?: (n: number) => string
  color?: string
  empty?: string
}>(), { format: (n: number) => String(n), color: '#C9567F', empty: 'Aún no hay datos para este período.' })
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)))
</script>

<template>
  <p v-if="!items.length" class="text-medium-emphasis">{{ empty }}</p>
  <ul v-else class="hbars">
    <li v-for="i in items" :key="i.label" :title="`${i.label}: ${format(i.value)}${i.sub ? ' · ' + i.sub : ''}`">
      <div class="hb-top"><span class="hb-label">{{ i.label }}</span><b>{{ format(i.value) }}</b></div>
      <div class="hb-track"><div class="hb-bar" :style="{ width: (i.value && i.value > 0 ? Math.max(2, (i.value / max) * 100) : 0) + '%', background: color }" /></div>
      <div v-if="i.sub" class="hb-sub">{{ i.sub }}</div>
    </li>
  </ul>
</template>

<style scoped>
.hbars { list-style: none; padding: 0; margin: 0 }
.hbars li { padding: 5px 0; border-radius: 6px }
.hbars li:hover { background: #FDF0F4 }
.hb-top { display: flex; justify-content: space-between; gap: 12px; font-size: 14px }
.hb-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.hb-track { height: 10px; background: #F3E6EA; border-radius: 5px; margin-top: 3px }
.hb-bar { height: 100%; border-radius: 5px; transition: width .3s }
.hb-sub { font-size: 12px; opacity: .7; margin-top: 2px }
</style>
