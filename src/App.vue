<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRaw } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import { FlockRenderer } from './renderer.js';
import { Simulation } from './simulation.js';

const FRAME_MS = 1000 / 60;
const MAX_DT = 3; // Avoids huge jumps after the tab was in the background.
const NARROW_SCREEN = 640;

const settings = reactive({
  separation: 1.8,
  alignment: 1,
  cohesion: 0.9,
  vision: 55,
  affinity: 0.85,
  agents: window.innerWidth < NARROW_SCREEN ? 200 : 600,
  agentScale: 1,
  trails: true,
  quadtree: false,
  vectors: false,
});

const canvas = ref(null);
const fps = ref(null);
const failed = ref(false);
const hoveredSpecies = ref(null);
const pinnedSpecies = ref(null);
const focus = computed(() => hoveredSpecies.value ?? pinnedSpecies.value);

// The raw object sees every slider change without the proxy cost in the hot path.
const rawSettings = toRaw(settings);
const simulation = new Simulation(rawSettings);
let renderer = null;
let frameId = 0;

let lastTime = performance.now();
let nextFrame = lastTime;
let fpsFrames = 0;
let fpsSince = lastTime;

function frame(now) {
  frameId = requestAnimationFrame(frame);

  // Holds 60 FPS on faster displays. The 1 ms allows for timer jitter.
  if (now < nextFrame - 1) return;
  nextFrame = Math.max(nextFrame + FRAME_MS, now);

  const dt = Math.min((now - lastTime) / FRAME_MS, MAX_DT);
  lastTime = now;

  simulation.step(dt, renderer.width, renderer.height);
  renderer.render(simulation, rawSettings, focus.value);

  fpsFrames++;
  if (now - fpsSince >= 500) {
    fps.value = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
}

function trackPointer(event) {
  simulation.pointer.x = event.clientX;
  simulation.pointer.y = event.clientY;
  simulation.pointer.active = true;
}

function releasePointer() {
  simulation.pointer.active = false;
}

function placeObstacle(event) {
  if (event.button !== 0) return;
  trackPointer(event);
  simulation.addObstacle(event.clientX, event.clientY);
}

onMounted(async () => {
  try {
    renderer = await FlockRenderer.create(canvas.value);
  } catch (error) {
    console.error(error);
    failed.value = true;
    return;
  }
  frameId = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  renderer?.destroy();
});
</script>

<template>
  <canvas
    ref="canvas"
    class="fixed inset-0 block size-full cursor-crosshair touch-none"
    aria-label="Simulación de boids. Haz clic para crear obstáculos."
    @pointermove="trackPointer"
    @pointerleave="releasePointer"
    @pointerdown="placeObstacle"
  ></canvas>

  <p v-if="failed" class="fixed inset-x-4 top-1/2 text-center text-slate-300">
    Este navegador no pudo iniciar WebGL, que la simulación necesita para dibujarse.
  </p>

  <ControlPanel
    :settings="settings"
    :fps="fps"
    :focus="focus"
    :pinned="pinnedSpecies"
    @hover-species="hoveredSpecies = $event"
    @pin-species="pinnedSpecies = pinnedSpecies === $event ? null : $event"
    @clear-obstacles="simulation.clearObstacles()"
  />
</template>
