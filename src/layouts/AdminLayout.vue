<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import Topbar from '@/components/layout/Topbar.vue'
</script>

<template>
  <div class="admin-layout">
    <Sidebar />
    <div class="admin-main">
      <Topbar />
      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-background);
}

.admin-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 100vh;
}

.admin-content {
  min-width: 0;
  overflow: auto;
  padding: 28px;
}

@media (max-width: 640px) {
  .admin-content {
    padding: 18px 16px;
  }
}
</style>
