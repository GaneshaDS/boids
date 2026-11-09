<script setup>
import { computed, useId } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, required: true },
});
const model = defineModel({ type: Number, required: true });

const id = useId();
const fill = computed(() => `${((model.value - props.min) / (props.max - props.min)) * 100}%`);
</script>

<template>
  <div class="grid grid-cols-[1fr_auto] items-baseline text-[13px]">
    <label :for="id" class="text-slate-300">{{ label }}</label>
    <output :for="id" class="font-medium text-white tabular-nums">{{ model }}</output>
    <input
      :id="id"
      v-model.number="model"
      class="range col-span-2"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :style="{ '--fill': fill }"
    />
  </div>
</template>
