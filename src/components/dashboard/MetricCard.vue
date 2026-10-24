<script setup lang="ts">
defineProps<{
  label: string
  value: string
  trend?: string
  tone?: 'default' | 'success' | 'warning'
}>()
</script>

<template>
  <article class="metric-card">
    <div class="metric-label">{{ label }}</div>
    <div class="metric-value">{{ value }}</div>
    <div v-if="trend" class="metric-trend" :class="`tone-${tone ?? 'default'}`">{{ trend }}</div>
  </article>
</template>

<style scoped>
.metric-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.metric-label {
  color: var(--color-text-muted);
  font-size: 12px;
}

.metric-value {
  margin: 8px 0 3px;
  overflow: hidden;
  color: var(--color-text);
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-trend {
  min-height: 17px;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.tone-success {
  color: var(--color-success);
}

.tone-warning {
  color: var(--color-warning);
}
</style>
