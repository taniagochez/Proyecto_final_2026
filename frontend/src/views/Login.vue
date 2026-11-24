<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores'

const auth = useAuth(), router = useRouter()
const modo = ref<'login' | 'registro'>('login')
const nombre = ref(''), correo = ref(''), pw = ref(''), pw2 = ref(''), error = ref(''), cargando = ref(false)
const correoOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim()))
const registroOk = computed(() => nombre.value.trim().length >= 2 && correoOk.value && pw.value.length >= 6 && pw.value === pw2.value)
const cambiar = () => { error.value = '' }

const destino = () => router.push(auth.user?.rol === 'Cliente' ? '/' : '/pedidos')
const entrar = async () => {
  error.value = ''
  if (await auth.login(correo.value, pw.value)) destino(); else error.value = 'Credenciales incorrectas'
}
const registrar = async () => {
  if (!registroOk.value) return
  cargando.value = true; error.value = ''
  const e = await auth.register(nombre.value.trim(), correo.value.trim(), pw.value)
  cargando.value = false
  if (e) error.value = e; else destino()
}
</script>

<template>
  <v-card max-width="420" class="mx-auto pa-6">
    <v-tabs v-model="modo" grow color="primary" class="mb-4" @update:model-value="cambiar">
      <v-tab value="login">Iniciar sesión</v-tab>
      <v-tab value="registro">Crear cuenta</v-tab>
    </v-tabs>

    <template v-if="modo === 'login'">
      <v-text-field v-model="correo" label="Correo" type="email" />
      <v-text-field v-model="pw" label="Contraseña" type="password" @keyup.enter="entrar" />
      <v-alert v-if="error" type="error" variant="flat" class="mb-3">{{ error }}</v-alert>
      <v-btn block color="primary" @click="entrar">Ingresar</v-btn>
      <div class="text-caption mt-4 text-medium-emphasis">Demo:<br>Administrador: admin@hi.com / admin123<br>Encargado: encargado@hi.com / encargado123<br>Cliente: cliente@hi.com / cliente123</div>
    </template>

    <template v-else>
      <v-text-field v-model="nombre" label="Nombre completo" autocomplete="name" />
      <v-text-field v-model="correo" label="Correo" type="email" autocomplete="email" :error-messages="correo && !correoOk ? 'Correo inválido' : ''" />
      <v-text-field v-model="pw" label="Contraseña (mínimo 6 caracteres)" type="password" autocomplete="new-password" />
      <v-text-field v-model="pw2" label="Confirmar contraseña" type="password" autocomplete="new-password" :error-messages="pw2 && pw !== pw2 ? 'Las contraseñas no coinciden' : ''" @keyup.enter="registrar" />
      <v-alert v-if="error" type="error" variant="flat" class="mb-3">{{ error }}</v-alert>
      <v-btn block color="primary" :disabled="!registroOk" :loading="cargando" @click="registrar">Crear cuenta</v-btn>
      <div class="text-caption mt-4 text-medium-emphasis">Las cuentas nuevas son de cliente: pueden hacer pedidos y calificar los ramos.</div>
    </template>
  </v-card>
</template>
