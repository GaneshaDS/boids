<script setup>
import { SPECIES, speciesCount, toCssColor } from '../species.js';

defineProps({
  agents: { type: Number, required: true },
  focus: { type: Number, default: null },
  pinned: { type: Number, default: null },
});
defineEmits(['hover', 'pin']);

// The fastest species first reads better than the draw order.
const ROWS = [...SPECIES].reverse().map((species) => ({ ...species, color: toCssColor(species.shades[1]) }));
</script>

<template>
  <ul class="-mx-1.5 space-y-0.5" @mouseleave="$emit('hover', null)">
    <li v-for="species in ROWS" :key="species.index">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-[background-color,opacity]"
        :class="[
          pinned === species.index ? 'bg-white/12' : 'hover:bg-white/8',
          focus !== null && focus !== species.index ? 'opacity-45' : '',
        ]"
        :aria-pressed="pinned === species.index"
        :title="`Resaltar ${species.name}`"
        @mouseenter="$emit('hover', species.index)"
        @focus="$emit('hover', species.index)"
        @blur="$emit('hover', null)"
        @click="$emit('pin', species.index)"
      >
        <svg class="size-6 shrink-0 -rotate-45" viewBox="-13 -13 26 26" aria-hidden="true">
          <path :d="species.path" :fill="species.color" />
          <path :d="species.mark" fill="#020617" fill-opacity="0.65" />
        </svg>
        <span class="text-[13px] font-medium text-white">{{ species.name }}</span>
        <span class="min-w-0 grow truncate text-xs text-slate-400">{{ species.trait }}</span>
        <span class="text-xs text-slate-300 tabular-nums">{{ speciesCount(species, agents) }}</span>
      </button>
    </li>
  </ul>
</template>
