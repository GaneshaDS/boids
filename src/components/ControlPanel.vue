<script setup>
import { ref } from 'vue';
import { ChevronDown, Trash2 } from 'lucide-vue-next';
import RangeField from './RangeField.vue';
import SpeciesLegend from './SpeciesLegend.vue';
import SwitchField from './SwitchField.vue';

const NARROW_SCREEN = 640;

defineProps({
  settings: { type: Object, required: true },
  fps: { type: Number, default: null },
  focus: { type: Number, default: null },
  pinned: { type: Number, default: null },
});
defineEmits(['hover-species', 'pin-species', 'clear-obstacles']);

const BEHAVIOR = [
  { name: 'separation', label: 'Separación', min: 0, max: 5, step: 0.1 },
  { name: 'alignment', label: 'Alineación', min: 0, max: 5, step: 0.1 },
  { name: 'cohesion', label: 'Cohesión', min: 0, max: 5, step: 0.1 },
  { name: 'vision', label: 'Radio de visión', min: 10, max: 150, step: 1 },
  { name: 'affinity', label: 'Afinidad de especie', min: 0, max: 1, step: 0.05 },
];
const POPULATION = [
  { name: 'agents', label: 'Agentes', min: 50, max: 1500, step: 50 },
  { name: 'agentScale', label: 'Tamaño', min: 0.6, max: 1.6, step: 0.1 },
];
const LAYERS = [
  { name: 'trails', label: 'Estelas' },
  { name: 'quadtree', label: 'Quadtree' },
  { name: 'vectors', label: 'Velocidad' },
];

const open = ref(window.innerWidth >= NARROW_SCREEN);
</script>

<template>
  <aside
    class="fixed top-4 right-4 flex max-h-[calc(100dvh-2rem)] w-[min(19rem,calc(100vw-2rem))] flex-col rounded-2xl bg-slate-950/70 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl"
  >
    <button
      type="button"
      class="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left"
      :aria-expanded="open"
      aria-controls="panel-body"
      @click="open = !open"
    >
      <span class="text-base font-semibold tracking-tight text-white">Boids</span>
      <span class="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-300 tabular-nums">
        {{ fps ?? '--' }} FPS
      </span>
      <ChevronDown class="size-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': open }" />
    </button>

    <div
      class="grid min-h-0 transition-[grid-template-rows] duration-200 ease-out"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div id="panel-body" class="min-h-0 overflow-y-auto" :inert="!open">
        <div class="space-y-4 px-4 pt-1 pb-4">
          <section>
            <h2 class="section-title">Especies</h2>
            <SpeciesLegend
              :agents="settings.agents"
              :focus="focus"
              :pinned="pinned"
              @hover="$emit('hover-species', $event)"
              @pin="$emit('pin-species', $event)"
            />
          </section>

          <section>
            <h2 class="section-title">Comportamiento</h2>
            <div class="space-y-2.5">
              <RangeField v-for="field in BEHAVIOR" :key="field.name" v-bind="field" v-model="settings[field.name]" />
            </div>
          </section>

          <section>
            <h2 class="section-title">Población</h2>
            <div class="space-y-2.5">
              <RangeField v-for="field in POPULATION" :key="field.name" v-bind="field" v-model="settings[field.name]" />
            </div>
          </section>

          <section>
            <h2 class="section-title">Capas</h2>
            <div class="space-y-2">
              <SwitchField v-for="layer in LAYERS" :key="layer.name" :label="layer.label" v-model="settings[layer.name]" />
            </div>
          </section>

          <div>
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/6 px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/12"
              @click="$emit('clear-obstacles')"
            >
              <Trash2 class="size-4" />
              Borrar obstáculos
            </button>
            <p class="mt-2.5 text-xs leading-relaxed text-slate-400">
              Clic: obstáculo. Cursor: depredador.
            </p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
