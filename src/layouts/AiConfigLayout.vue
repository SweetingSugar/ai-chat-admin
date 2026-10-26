<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const activeTab = computed(() => route.path.endsWith('/models') ? 'models' : 'providers')

function selectTab(name: string): void {
  void router.push(name === 'models' ? '/ai/models' : '/ai/providers')
}
</script>

<template>
  <section class="ai-config-page">
    <header class="page-head">
      <div>
        <h1>AI 配置</h1>
        <p>管理模型供应商与可用模型</p>
      </div>
    </header>
    <el-tabs :model-value="activeTab" @tab-change="selectTab">
      <el-tab-pane label="供应商管理" name="providers" />
      <el-tab-pane label="模型管理" name="models" />
    </el-tabs>
    <RouterView />
  </section>
</template>

<style scoped>
.ai-config-page {
  max-width: 1480px;
  margin: 0 auto;
}

.page-head {
  margin-bottom: 8px;
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
</style>
