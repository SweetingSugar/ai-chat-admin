<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import * as agentsApi from '@/api/agents'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import type { AgentAdmin } from '@/types/agents'

const agents = ref<AgentAdmin[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailVisible = ref(false)
const selectedAgent = ref<AgentAdmin | null>(null)
let requestId = 0

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function formatValues(values: Array<number | string>, emptyLabel: string): string {
  return values.length === 0 ? emptyLabel : values.join('、')
}

async function loadAgents(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await agentsApi.listAgents({ page: page.value, size: pageSize.value })
    if (currentRequestId !== requestId) return
    agents.value = result.records
    total.value = result.total
    page.value = result.current
    pageSize.value = result.size
  } catch (reason) {
    if (currentRequestId === requestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

function changePage(value: number): void {
  page.value = value
  void loadAgents()
}

function changePageSize(value: number): void {
  page.value = 1
  pageSize.value = value
  void loadAgents()
}

function openDetail(agent: AgentAdmin): void {
  selectedAgent.value = agent
  detailVisible.value = true
}

function clearDetail(): void {
  detailVisible.value = false
  selectedAgent.value = null
}

onMounted(() => {
  void loadAgents()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="Agent 管理" description="查看系统中的 Agent 配置与资源关联">
      <template #actions>
        <el-button data-test="agents-refresh" :loading="loading" @click="loadAgents">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button data-test="agents-retry" text type="danger" size="small" @click="loadAgents">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="agents" row-key="id" class="management-table">
          <el-table-column label="Agent" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <small>{{ row.description || '—' }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="所属用户" width="100" />
          <el-table-column label="模型" width="100">
            <template #default="{ row }">{{ row.modelId ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="知识库" width="100">
            <template #default="{ row }">{{ row.knowledgeBaseIds.length }}</template>
          </el-table-column>
          <el-table-column label="工具" width="90">
            <template #default="{ row }">{{ row.toolCodes.length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="90">
            <template #default="{ row }">
              <el-button :data-test="`agent-detail-${row.id}`" text type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无 Agent 数据</span></template>
        </el-table>
      </div>
      <div class="pagination-row">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </article>

    <el-drawer
      v-model="detailVisible"
      :title="selectedAgent?.name ?? 'Agent 详情'"
      size="620px"
      :append-to-body="false"
      @close="clearDetail"
    >
      <div v-if="selectedAgent" class="detail-panel">
        <section>
          <h3>基本信息</h3>
          <dl class="detail-list">
            <div><dt>Agent ID</dt><dd>{{ selectedAgent.id }}</dd></div>
            <div><dt>所属用户 ID</dt><dd>{{ selectedAgent.userId }}</dd></div>
            <div><dt>描述</dt><dd>{{ selectedAgent.description || '—' }}</dd></div>
            <div><dt>状态</dt><dd><StatusTag :status="selectedAgent.status" /></dd></div>
            <div><dt>创建时间</dt><dd>{{ formatDateTime(selectedAgent.createTime) }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatDateTime(selectedAgent.updateTime) }}</dd></div>
          </dl>
        </section>
        <section>
          <h3>运行配置</h3>
          <dl class="detail-list">
            <div><dt>模型 ID</dt><dd>{{ selectedAgent.modelId ?? '—' }}</dd></div>
          </dl>
          <pre class="prompt-content">{{ selectedAgent.systemPrompt }}</pre>
        </section>
        <section>
          <h3>关联资源</h3>
          <dl class="detail-list">
            <div><dt>知识库 ID</dt><dd>{{ formatValues(selectedAgent.knowledgeBaseIds, '暂无关联知识库') }}</dd></div>
            <div><dt>工具编码</dt><dd>{{ formatValues(selectedAgent.toolCodes, '暂无关联工具') }}</dd></div>
          </dl>
        </section>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 980px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.empty-state { color: var(--color-text-muted); }
.detail-panel { display: grid; gap: 22px; }
.detail-panel section { display: grid; gap: 12px; }
.detail-panel h3 { margin: 0; font-size: 14px; }
.detail-list { display: grid; gap: 10px; margin: 0; }
.detail-list div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; }
.detail-list dt { color: var(--color-text-muted); }
.detail-list dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.prompt-content { max-height: 36vh; margin: 0; padding: 14px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-background); white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
