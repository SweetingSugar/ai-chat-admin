<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <header class="page-header">
    <div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="page-actions">
      <slot name="actions">
        <el-button v-if="$slots.actions" type="primary" @click="$emit('action')">新建</el-button>
      </slot>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: 24px;
  letter-spacing: -0.02em;
}

p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }
}
</style>
