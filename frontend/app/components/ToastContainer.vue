<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-start gap-3 cursor-pointer',
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-primary text-white'
          ]"
          @click="dismiss(toast.id)"
        >
          <!-- Icon -->
          <span class="text-lg leading-none mt-0.5">
            <template v-if="toast.type === 'success'">&#10003;</template>
            <template v-else-if="toast.type === 'error'">&#10007;</template>
            <template v-else>&#9432;</template>
          </span>
          <span class="flex-1">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts } = useToast()

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
