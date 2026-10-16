<template>
  <!-- KarobarPro Quick POS Action Bar -->
  <div
    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs select-none"
    style="background: rgba(17,43,66,0.06); border: 1px solid rgba(17,43,66,0.12);"
  >
    <!-- Brand badge -->
    <div
      class="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300"
      style="border-color: rgba(17,43,66,0.2);"
    >
      <span
        class="font-extrabold text-xs px-1.5 py-0.5 rounded text-white"
        style="background: #16a34a; font-size: 10px; letter-spacing: 0.05em;"
      >KP</span>
      <span class="font-semibold text-gray-500" style="font-size: 10px;">POS</span>
    </div>

    <!-- Shortcut Pills -->
    <div
      v-for="shortcut in shortcuts"
      :key="shortcut.key"
      class="flex items-center gap-1 cursor-default"
      :title="shortcut.description"
    >
      <kbd
        class="px-1.5 py-0.5 rounded font-bold text-gray-700 bg-white border border-gray-300 shadow-sm"
        style="font-size: 10px; min-width: 28px; text-align: center;"
      >{{ shortcut.key }}</kbd>
      <span class="text-gray-500 font-medium" style="font-size: 10px;">{{ shortcut.label }}</span>
      <span class="text-gray-300 mx-1" style="font-size: 10px;">·</span>
    </div>

    <!-- Auto-focus Scan Indicator -->
    <div
      v-if="autoFocusScan"
      class="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-bold"
      style="background: #16a34a; font-size: 9px;"
    >
      <span>●</span>
      <span>SCAN READY</span>
    </div>
    <div
      v-else
      class="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-gray-500"
      style="background: #f3f4f6; font-size: 9px;"
    >
      <span>○</span>
      <span>F2 TO SCAN</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'KPPosToolbar',
  props: {
    autoFocusScan: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    shortcuts(): { key: string; label: string; description: string }[] {
      return [
        { key: 'F2', label: 'Search', description: 'Focus item search / barcode' },
        { key: 'F4', label: 'Pay', description: 'Open payment window' },
        { key: 'F5', label: 'New Sale', description: 'Clear and start a new sale' },
        { key: 'F6', label: 'Scan Mode', description: 'Toggle auto-focus scan mode' },
        { key: 'Q+Num', label: 'Quick Qty', description: 'Hold Q then type quantity' },
      ];
    },
  },
});
</script>
