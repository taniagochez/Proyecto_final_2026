<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores'

const auth = useAuth(), router = useRouter()
const correo = ref(''), pw = ref(''), error = ref(''), cargando = ref(false)

// Lee los valores directo del formulario: el autocompletado del navegador a veces
// llena los campos SIN avisarle a v-model, y entonces se enviaban vacíos.
const entrar = async (ev: Event) => {
  if (cargando.value) return
  const fd = new FormData(ev.target as HTMLFormElement)
  const c = String(fd.get('correo') ?? correo.value).trim().toLowerCase()
  const p = String(fd.get('password') ?? pw.value)
  if (!c || !p) { error.value = 'Escribe tu correo y contraseña'; return }

  error.value = ''; cargando.value = true
  try {
    if (await auth.login(c, p)) {
      await router.replace(auth.user?.rol === 'Cliente' ? '/' : '/pedidos')
    } else {
      error.value = 'Credenciales incorrectas o servidor no disponible'
    }
  } finally { cargando.value = false }
}
</script>

<template>
  <v-card max-width="420" class="mx-auto pa-6">
    <h2 class="text-h5 mb-4">Iniciar sesión</h2>
    <form @submit.prevent="entrar">
      <v-text-field v-model="correo" name="correo" label="Correo" type="email" autocomplete="username" @update:model-value="error = ''" />
      <v-text-field v-model="pw" name="password" label="Contraseña" type="password" autocomplete="current-password" @update:model-value="error = ''" />
      <v-alert v-if="error" type="error" variant="flat" class="mb-3">{{ error }}</v-alert>
      <v-btn block color="primary" type="submit" :loading="cargando" :disabled="cargando">Ingresar</v-btn>
    </form>
    <div class="text-caption mt-4 text-medium-emphasis">Demo:<br>Administrador: admin@hi.com / admin123<br>Encargado: encargado@hi.com / encargado123<br>Cliente: cliente@hi.com / cliente123</div>
  </v-card>
</template>
