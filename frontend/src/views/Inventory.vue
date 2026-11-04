<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { mdiAlertCircleOutline, mdiPackageVariant, mdiPlus } from '@mdi/js'
import { useInventory } from '../stores'

const inv = useInventory()
onMounted(inv.cargarAdmin)
const dialog = ref(false), sel = ref(''), cant = ref<number | null>(null)
const abrir = (id: string) => { sel.value = id; cant.value = null; dialog.value = true }
const guardar = async () => { await inv.entrada(sel.value, Number(cant.value)); dialog.value = false }
const hIns = [
  { title: 'Insumo', key: 'nombre' }, { title: 'Stock', key: 'stock' }, { title: 'Unidad', key: 'unidad' },
  { title: 'Mínimo', key: 'stockMinimo' }, { title: 'Estado', key: 'estado', sortable: false }, { title: '', key: 'acc', sortable: false }
]
const hMov = [
  { title: 'Fecha', key: 'fecha' }, { title: 'Ítem', key: 'ref' }, { title: 'Tipo', key: 'tipo' },
  { title: 'Cantidad', key: 'cantidad' }, { title: 'Pedido', key: 'pedidoId' }
]
</script>

<template>
  <h1 class="text-h4 mb-4"><v-icon :icon="mdiPackageVariant" color="primary" /> Inventario</h1>
  <v-alert v-if="inv.bajos.length" color="error" variant="flat" :icon="mdiAlertCircleOutline" class="mb-4">
    Stock bajo: {{ inv.bajos.map((i) => i.nombre).join(', ') }}
  </v-alert>
  <v-card class="mb-6">
    <v-card-title>Insumos</v-card-title>
    <v-data-table :headers="hIns" :items="inv.insumos">
      <template #item.estado="{ item }">
        <v-chip size="small" :color="item.stock <= item.stockMinimo ? 'error' : 'secondary'">{{ item.stock <= item.stockMinimo ? 'Stock bajo' : 'OK' }}</v-chip>
      </template>
      <template #item.acc="{ item }"><v-btn size="small" color="secondary" :prepend-icon="mdiPlus" @click="abrir(item.id)">Entrada</v-btn></template>
    </v-data-table>
  </v-card>
  <v-card>
    <v-card-title>Historial de movimientos</v-card-title>
    <v-data-table :headers="hMov" :items="inv.movimientos" no-data-text="Sin movimientos todavía">
      <template #item.fecha="{ item }">{{ new Date(item.fecha).toLocaleString('es-SV') }}</template>
      <template #item.tipo="{ item }"><v-chip size="small" :color="item.tipo === 'entrada' ? 'secondary' : 'primary'">{{ item.tipo }}</v-chip></template>
    </v-data-table>
  </v-card>
  <v-dialog v-model="dialog" max-width="360">
    <v-card class="pa-4">
      <v-card-title>Registrar entrada</v-card-title>
      <v-text-field v-model.number="cant" type="number" min="1" label="Cantidad recibida" />
      <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn><v-btn color="secondary" :disabled="!cant || cant < 1" @click="guardar">Guardar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
