<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiCamera, mdiContentSave, mdiDelete, mdiPlus, mdiPlusBox } from '@mdi/js'
import { useInventory } from '../stores'
import { errMsg } from '../services/api'

const inv = useInventory(), router = useRouter()
onMounted(inv.cargarAdmin) // carga la lista de insumos para armar la receta

const form = ref()
const nombre = ref(''), categoria = ref(''), descripcion = ref(''), icono = ref('💐')
const precio = ref<number | null>(null), stock = ref<number | null>(0)
const archivo = ref<File | File[] | null>(null)
const receta = ref<{ insumoId: string; cantidad: number | null }[]>([])
const error = ref(''), guardando = ref(false)

const categorias = computed(() => [...new Set(inv.productos.map((p) => p.categoria))])
// Según la versión de Vuetify, v-file-input devuelve un File o un arreglo: cubrimos ambos
const imagen = computed(() => (Array.isArray(archivo.value) ? archivo.value[0] : archivo.value) ?? null)
const preview = computed(() => (imagen.value ? URL.createObjectURL(imagen.value) : ''))

// Reglas de validación
const req = (v: unknown) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Campo obligatorio'
const rPositivo = (v: number) => Number(v) > 0 || 'Debe ser mayor a 0'
const rStock = (v: number) => (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Entero mayor o igual a 0'
const rImagen = () =>
  !imagen.value ||
  (['image/jpeg', 'image/png', 'image/webp'].includes(imagen.value.type) && imagen.value.size <= 3 * 1024 * 1024) ||
  'Solo JPG, PNG o WEBP de máximo 3 MB'

const guardar = async () => {
  error.value = ''
  const { valid } = await form.value.validate()
  if (!valid) return
  const fd = new FormData()
  fd.append('nombre', nombre.value)
  fd.append('categoria', categoria.value)
  fd.append('precio', String(precio.value))
  fd.append('stock', String(stock.value))
  fd.append('descripcion', descripcion.value)
  fd.append('icono', icono.value)
  fd.append('receta', JSON.stringify(receta.value.filter((r) => r.insumoId && r.cantidad)))
  if (imagen.value) fd.append('imagen', imagen.value)
  guardando.value = true
  try {
    await inv.crearProducto(fd)
    router.push('/') // al catálogo, donde ya aparece el nuevo producto
  } catch (e) { error.value = errMsg(e) } finally { guardando.value = false }
}
</script>

<template>
  <h1 class="text-h4 mb-4"><v-icon :icon="mdiPlusBox" color="primary" /> Nuevo producto</h1>
  <v-card class="pa-4" max-width="760">
    <v-form ref="form" @submit.prevent="guardar">
      <v-text-field v-model="nombre" label="Nombre del arreglo" :rules="[req]" />
      <v-combobox v-model="categoria" :items="categorias" label="Categoría / ocasión" hint="Elige una existente o escribe una nueva" persistent-hint :rules="[req]" class="mb-2" />
      <v-row>
        <v-col cols="12" sm="4"><v-text-field v-model.number="precio" type="number" min="0" step="0.01" prefix="$" label="Precio" :rules="[req, rPositivo]" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model.number="stock" type="number" min="0" label="Unidades listas (stock)" :rules="[req, rStock]" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="icono" label="Ícono (emoji)" maxlength="4" /></v-col>
      </v-row>
      <v-textarea v-model="descripcion" label="Descripción" rows="2" counter="300" maxlength="300" />
      <v-file-input v-model="archivo" label="Foto del producto" accept="image/jpeg,image/png,image/webp" :prepend-icon="mdiCamera" show-size :rules="[rImagen]" />
      <v-img v-if="preview" :src="preview" height="180" class="mb-4 rounded" cover />

      <div class="text-subtitle-1 mt-2">Receta (insumos que gasta cada unidad)</div>
      <p class="text-medium-emphasis mb-2">Opcional. Si la llenas, cada pedido descontará estos insumos del inventario.</p>
      <v-row v-for="(r, i) in receta" :key="i" dense align="center">
        <v-col cols="7"><v-select v-model="r.insumoId" :items="inv.insumos" item-title="nombre" item-value="id" label="Insumo" :rules="[req]" /></v-col>
        <v-col cols="3"><v-text-field v-model.number="r.cantidad" type="number" min="1" label="Cantidad" :rules="[req, rPositivo]" /></v-col>
        <v-col cols="2"><v-btn :icon="mdiDelete" variant="text" color="error" @click="receta.splice(i, 1)" /></v-col>
      </v-row>
      <v-btn :prepend-icon="mdiPlus" variant="tonal" class="mb-4" @click="receta.push({ insumoId: '', cantidad: 1 })">Agregar insumo</v-btn>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <div class="d-flex ga-2">
        <v-btn color="secondary" type="submit" :prepend-icon="mdiContentSave" :loading="guardando">Guardar producto</v-btn>
        <v-btn variant="text" @click="router.push('/')">Cancelar</v-btn>
      </div>
    </v-form>
  </v-card>
</template>