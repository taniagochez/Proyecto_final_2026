<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores'

const auth = useAuth(), router = useRouter()
const correo = ref(''), pw = ref(''), error = ref(false)
const entrar = async () => { if (await auth.login(correo.value, pw.value)) router.push(auth.user?.rol === 'Cliente' ? '/' : '/pedidos'); else error.value = true }
</script>

<template>
  <v-card max-width="420" class="mx-auto pa-6">
    <h2 class="text-h5 mb-4">Iniciar sesión</h2>
    <v-text-field v-model="correo" label="Correo" type="email" />
    <v-text-field v-model="pw" label="Contraseña" type="password" @keyup.enter="entrar" />
    <v-alert v-if="error" type="error" variant="flat" class="mb-3">Credenciales incorrectas</v-alert>
    <v-btn block color="primary" @click="entrar">Ingresar</v-btn>
    <div class="text-caption mt-4 text-medium-emphasis">Demo:<br>Administrador: admin@hi.com / admin123<br>Encargado: encargado@hi.com / encargado123<br>Cliente: cliente@hi.com / cliente123</div>
  </v-card>
</template>
