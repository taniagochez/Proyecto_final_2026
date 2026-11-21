<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { mdiAccountCog, mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'
import { useUsuarios } from '../stores'
import type { Usuario } from '../types'

const us = useUsuarios()
const cargaError = ref('')
onMounted(() => us.cargar().catch(() => { cargaError.value = 'No se pudo cargar la lista de usuarios' }))

const color = { Administrador: 'secondary', Encargado: 'warning', Cliente: 'info' } as const
const headers = [
  { title: 'Nombre', key: 'nombre' }, { title: 'Correo', key: 'correo' },
  { title: 'Rol', key: 'rol' }, { title: '', key: 'acc', sortable: false }
]

// --- Crear / editar encargado (mismo formulario) ---
const dialog = ref(false), editando = ref<Usuario | null>(null)
const nombre = ref(''), correo = ref(''), pw = ref(''), error = ref(''), guardando = ref(false)
const abrir = (u: Usuario | null = null) => {
  editando.value = u
  nombre.value = u?.nombre ?? ''; correo.value = u?.correo ?? ''; pw.value = ''; error.value = ''
  dialog.value = true
}
const guardar = async (ev: Event) => {
  if (guardando.value) return
  const fd = new FormData(ev.target as HTMLFormElement)
  const n = String(fd.get('nombre') ?? ''), c = String(fd.get('correo') ?? ''), p = String(fd.get('password') ?? '')
  guardando.value = true; error.value = ''
  const r = editando.value
    ? await us.editarEncargado(editando.value.correo, { nombre: n, ...(p ? { password: p } : {}) })
    : await us.crearEncargado(n, c, p)
  guardando.value = false
  if (r.ok) { dialog.value = false; aviso(editando.value ? 'Encargado actualizado' : 'Encargado creado') } else error.value = r.error
}

// --- Eliminar encargado ---
const borrar = ref<Usuario | null>(null)
const confirmarBorrar = async () => {
  if (!borrar.value) return
  const r = await us.eliminar(borrar.value.correo)
  borrar.value = null
  aviso(r.ok ? 'Encargado eliminado' : r.error)
}

const snack = ref(false), msg = ref('')
const aviso = (m: string) => { msg.value = m; snack.value = true }
</script>

<template>
  <div class="d-flex align-center mb-4">
    <h1 class="text-h4"><v-icon :icon="mdiAccountCog" color="primary" /> Usuarios</h1>
    <v-spacer />
    <v-btn color="secondary" :prepend-icon="mdiPlus" @click="abrir()">Nuevo encargado</v-btn>
  </div>
  <v-alert v-if="cargaError" type="error" variant="flat" class="mb-4">{{ cargaError }}</v-alert>
  <v-card>
    <v-data-table :headers="headers" :items="us.lista" no-data-text="Sin usuarios">
      <template #item.rol="{ item }"><v-chip size="small" :color="color[item.rol]">{{ item.rol }}</v-chip></template>
      <template #item.acc="{ item }">
        <v-btn v-if="item.rol === 'Encargado'" size="small" color="secondary" variant="text" :prepend-icon="mdiPencil" @click="abrir(item)">Editar</v-btn>
        <v-btn v-if="item.rol === 'Encargado'" size="small" color="error" variant="text" :prepend-icon="mdiDelete" @click="borrar = item">Eliminar</v-btn>
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="dialog" max-width="400">
    <v-card class="pa-4">
      <v-card-title>{{ editando ? 'Editar encargado' : 'Nuevo encargado' }}</v-card-title>
      <form @submit.prevent="guardar">
        <v-text-field v-model="nombre" name="nombre" label="Nombre completo" autocomplete="off" />
        <v-text-field v-model="correo" name="correo" label="Correo" type="email" autocomplete="off" :disabled="!!editando" :hint="editando ? 'El correo no se puede cambiar' : ''" persistent-hint />
        <v-text-field v-model="pw" name="password" type="text" autocomplete="off" class="mt-3"
          :label="editando ? 'Nueva contraseña (opcional)' : 'Contraseña (mínimo 6 caracteres)'"
          :hint="editando ? 'Déjala vacía si no quieres cambiarla' : ''" persistent-hint />
        <v-alert v-if="error" type="error" variant="flat" class="my-3">{{ error }}</v-alert>
        <v-card-actions>
          <v-spacer /><v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="secondary" type="submit" :loading="guardando">{{ editando ? 'Guardar' : 'Crear' }}</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>

  <v-dialog :model-value="!!borrar" max-width="380" @update:model-value="borrar = null">
    <v-card class="pa-4">
      <v-card-title>¿Eliminar encargado?</v-card-title>
      <v-card-text>{{ borrar?.nombre }} ({{ borrar?.correo }}) ya no podrá iniciar sesión.</v-card-text>
      <v-card-actions><v-spacer /><v-btn variant="text" @click="borrar = null">Cancelar</v-btn><v-btn color="error" @click="confirmarBorrar">Eliminar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snack" timeout="3000">{{ msg }}</v-snackbar>
</template>
