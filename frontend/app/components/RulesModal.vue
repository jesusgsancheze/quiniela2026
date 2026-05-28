<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        @click.self="close"
      >
        <div
          class="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col rounded-t-2xl"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('rules.title')"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
            <div>
              <h2 class="text-2xl font-bold text-primary-dark">{{ $t('rules.title') }}</h2>
              <p class="text-sm text-gray-500 mt-1">{{ $t('rules.subtitle') }}</p>
            </div>
            <button
              @click="close"
              class="text-gray-400 hover:text-gray-700 transition-colors p-1 -m-1 rounded-full hover:bg-gray-100"
              :aria-label="$t('rules.close')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body (scrollable) -->
          <div class="overflow-y-auto px-6 py-5 space-y-6 text-gray-700 text-sm">
            <!-- How to play -->
            <section>
              <h3 class="flex items-center gap-2 text-base font-bold text-primary-dark mb-3">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-primary-dark text-sm font-bold">1</span>
                {{ $t('rules.sectionHowToPlay') }}
              </h3>
              <ol class="list-decimal list-outside ml-5 space-y-1.5">
                <li>{{ $t('rules.howToPlay1') }}</li>
                <li>{{ $t('rules.howToPlay2') }}</li>
                <li>{{ $t('rules.howToPlay3') }}</li>
                <li>{{ $t('rules.howToPlay4') }}</li>
                <li>{{ $t('rules.howToPlay5') }}</li>
              </ol>
            </section>

            <!-- Scoring -->
            <section>
              <h3 class="flex items-center gap-2 text-base font-bold text-primary-dark mb-3">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-primary-dark text-sm font-bold">2</span>
                {{ $t('rules.sectionScoring') }}
              </h3>
              <p class="mb-3">{{ $t('rules.scoringIntro') }}</p>
              <div class="space-y-2">
                <div class="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <span class="shrink-0 inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-green-600 text-white text-xs font-bold">
                    {{ $t('rules.scoringPoints', { n: 3 }) }}
                  </span>
                  <div>
                    <p class="font-semibold text-gray-900">{{ $t('rules.scoringExact') }}</p>
                    <p class="text-gray-600">{{ $t('rules.scoringExactDesc') }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <span class="shrink-0 inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-yellow-500 text-white text-xs font-bold">
                    {{ $t('rules.scoringPoints', { n: 1 }) }}
                  </span>
                  <div>
                    <p class="font-semibold text-gray-900">{{ $t('rules.scoringOutcome') }}</p>
                    <p class="text-gray-600">{{ $t('rules.scoringOutcomeDesc') }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span class="shrink-0 inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-gray-400 text-white text-xs font-bold">
                    {{ $t('rules.scoringZero') }}
                  </span>
                  <div>
                    <p class="font-semibold text-gray-900">{{ $t('rules.scoringWrong') }}</p>
                    <p class="text-gray-600">{{ $t('rules.scoringWrongDesc') }}</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Deadlines -->
            <section>
              <h3 class="flex items-center gap-2 text-base font-bold text-primary-dark mb-3">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-primary-dark text-sm font-bold">3</span>
                {{ $t('rules.sectionDeadlines') }}
              </h3>
              <ul class="list-disc list-outside ml-5 space-y-1.5">
                <li>{{ $t('rules.deadline1') }}</li>
                <li>{{ $t('rules.deadline2') }}</li>
                <li>{{ $t('rules.deadline3') }}</li>
                <li>{{ $t('rules.deadline4') }}</li>
              </ul>
            </section>

            <!-- Prizes -->
            <section>
              <h3 class="flex items-center gap-2 text-base font-bold text-primary-dark mb-3">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-primary-dark text-sm font-bold">4</span>
                {{ $t('rules.sectionPrizes') }}
              </h3>
              <ul class="list-disc list-outside ml-5 space-y-1.5">
                <li>{{ $t('rules.prizes1') }}</li>
                <li>{{ $t('rules.prizes2') }}</li>
                <li>{{ $t('rules.prizes4') }}</li>
              </ul>
            </section>
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-gray-200 flex justify-end">
            <button
              @click="close"
              class="px-5 py-2 bg-primary-dark hover:bg-primary text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {{ $t('rules.gotIt') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
