<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">Quiniela 2026</h1>
        <p class="text-accent text-lg">FIFA World Cup Pools</p>
        <div class="flex justify-center gap-2 mt-3">
          <div class="w-8 h-1 bg-accent rounded"></div>
          <div class="w-8 h-1 bg-white rounded"></div>
          <div class="w-8 h-1 bg-secondary rounded"></div>
        </div>
      </div>
      <slot />
    </div>
  </div>
</template>
