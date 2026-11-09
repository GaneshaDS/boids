<script setup>
defineProps({ label: { type: String, required: true } });
const model = defineModel({ type: Boolean, required: true });
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between text-[13px] text-slate-300">
    {{ label }}
    <input v-model="model" class="peer sr-only" type="checkbox" role="switch" />
    <span
      class="relative h-5 w-9 rounded-full bg-white/12 transition-colors peer-checked:bg-sky-400 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-300 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
    ></span>
  </label>
</template>
