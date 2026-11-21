<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores'

const auth = useAuth(), router = useRouter()
const nombre = ref(''), correo = ref(''), pw = ref(''), pw2 = ref(''), error = ref(''), cargando = ref(false)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Se leen los valores del formulario (no solo de v-model) para que funcione con el autocompletado del navegador.
const registrar = async (ev: Event) => {
  if (cargando.value) return
  const fd = new FormData(ev.target as HTMLFormElement)
  const n = String(fd.get('nombre') ?? '').trim()
  const c = String(fd.get('correo') ?? '').trim().toLowerCase()
  const p = String(fd.get('password') ?? ''), p2 = String(fd.get('password2') ?? '')
  if (n.length < 2) { error.value = 'Escribe tu nombre'; return }
  if (!EMAIL_RE.test(c)) { error.value = 'Correo inválido'; return }
  if (p.length < 6) { error.value = 'La contraseña debe tener al menos 6 caracteres'; return }
  if (p !== p2) { error.value = 'Las contraseñas no coinciden'; return }

  error.value = ''; cargando.value = true
  try {
    const r = await auth.register(n, c, p)
    if (r.ok) await router.replace('/')
    else error.value = r.error
  } finally { cargando.value = false }
}
</script>

<template>
  <v-card max-width="420" class="mx-auto pa-6">
    <h2 class="text-h5 mb-4">Crear cuenta</h2>
    <form @submit.prevent="registrar">
      <v-text-field v-model="nombre" name="nombre" label="Nombre completo" autocomplete="name" @update:model-value="error = ''" />
      <v-text-field v-model="correo" name="correo" label="Correo" type="email" autocomplete="username" @update:model-value="error = ''" />
      <v-text-field v-model="pw" name="password" label="Contraseña (mínimo 6 caracteres)" type="password" autocomplete="new-password" @update:model-value="error = ''" />
      <v-text-field v-model="pw2" name="password2" label="Confirmar contraseña" type="password" autocomplete="new-password" @update:model-value="error = ''" />
      <v-alert v-if="error" type="error" variant="flat" class="mb-3">{{ error }}</v-alert>
      <v-btn block color="primary" type="submit" :loading="cargando" :disabled="cargando">Registrarme</v-btn>
    </form>
    <div class="text-body-2 mt-4 text-center">¿Ya tienes cuenta? <router-link to="/login">Inicia sesión</router-link></div>
  </v-card>
</template>
