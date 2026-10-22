<script setup lang="ts">
/** A simple mark of rising bars; it is not the official BPS logo. Put the official logo in public/ and swap this out if you need it. */
defineProps<{ class?: string }>();
</script>

<template>
  <svg viewBox="0 0 40 40" :class="$props.class" role="img" aria-label="Logo Kalkulator NTB BPS Kabupaten Takalar">
    <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.18" />
    <rect x="9" y="21" width="5" height="10" rx="1.5" fill="currentColor" />
    <rect x="17.5" y="13" width="5" height="18" rx="1.5" fill="currentColor" />
    <rect x="26" y="17" width="5" height="14" rx="1.5" fill="currentColor" />
    <circle cx="30" cy="9.5" r="3" fill="#f59e0b" />
  </svg>
</template>
