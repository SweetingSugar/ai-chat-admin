<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import * as knowledgeApi from '@/api/knowledge'
import PageHeader from '@/components/management/PageHeader.vue'
import type {
  KnowledgeBaseAdmin,
  KnowledgeBaseStatus,
  KnowledgeDocument,
  KnowledgeDocumentContent,
  KnowledgeDocumentSourceType,
  KnowledgeDocumentStatus,
} from '@/types/knowledge'

const knowledgeBases = ref<KnowledgeBaseAdmin[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const basePage = ref(1)
const basePageSize = ref(20)
const baseTotal = ref(0)

const documentsVisible = ref(false)
const selectedBase = ref<KnowledgeBaseAdmin | null>(null)
const documents = ref<KnowledgeDocument[]>([])
const documentsLoading = ref(false)
const documentsError = ref<string | null>(null)
const documentPage = ref(1)
const documentPageSize = ref(20)
const documentTotal = ref(0)

const contentVisible = ref(false)
const contentLoading = ref(false)
const contentError = ref<string | null>(null)
const contentDocument = ref<KnowledgeDocument | null>(null)
const selectedContent = ref<KnowledgeDocumentContent | null>(null)

let baseRequestId = 0
let documentRequestId = 0
let contentRequestId = 0

const baseStatusLabels: Record<KnowledgeBaseStatus, string> = {
  ACTIVE: '启用',
  DISABLED: '停用',
  DELETED: '已删除',
}
const sourceTypeLabels: Record<KnowledgeDocumentSourceType, string> = {
  TEXT: '文本',
  FILE: '文件',
}
const documentStatusLabels: Record<KnowledgeDocumentStatus, string> = {
  PENDING: '待处理',
  INDEXING: '索引中',
  READY: '就绪',
  FAILED: '失败',
  DELETED: '已删除',
}

const documentsTitle = computed(() => selectedBase.value
  ? `文档：${selectedBase.value.name}`
  : '知识库文档')

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function formatIndexState(row: KnowledgeBaseAdmin): string {
  if (row.reindexing) return '重建中'
  return row.activeIndexVersion === null ? '未建立' : `版本 ${row.activeIndexVersion}`
}

async function loadKnowledgeBases(): Promise<void> {
  const requestId = ++baseRequestId
  loading.value = true
  error.value = null
  try {
    const result = await knowledgeApi.listKnowledgeBases({
      page: basePage.value,
      size: basePageSize.value,
    })
    if (requestId !== baseRequestId) return
    knowledgeBases.value = result.records
    baseTotal.value = result.total
    basePage.value = result.current
    basePageSize.value = result.size
  } catch (reason) {
    if (requestId === baseRequestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === baseRequestId) loading.value = false
  }
}

function openDocuments(row: KnowledgeBaseAdmin): void {
  documentRequestId += 1
  selectedBase.value = row
  documents.value = []
  documentsError.value = null
  documentPage.value = 1
  documentPageSize.value = 20
  documentsVisible.value = true
  void loadDocuments()
}

async function loadDocuments(): Promise<void> {
  const base = selectedBase.value
  if (!base) return
  const requestId = ++documentRequestId
  documentsLoading.value = true
  documentsError.value = null
  try {
    const result = await knowledgeApi.listKnowledgeDocuments(base.id, {
      page: documentPage.value,
      size: documentPageSize.value,
    })
    if (requestId !== documentRequestId || selectedBase.value?.id !== base.id) return
    documents.value = result.records
    documentTotal.value = result.total
    documentPage.value = result.current
    documentPageSize.value = result.size
  } catch (reason) {
    if (requestId === documentRequestId) documentsError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === documentRequestId) documentsLoading.value = false
  }
}

function clearDocuments(): void {
  documentRequestId += 1
  documentsVisible.value = false
  selectedBase.value = null
  documents.value = []
  documentsError.value = null
}

async function openTextContent(row: KnowledgeDocument): Promise<void> {
  const base = selectedBase.value
  if (!base || row.sourceType !== 'TEXT') return
  const requestId = ++contentRequestId
  contentDocument.value = row
  contentVisible.value = true
  contentLoading.value = true
  contentError.value = null
  selectedContent.value = null
  try {
    const result = await knowledgeApi.getKnowledgeDocumentContent(base.id, row.id)
    if (requestId === contentRequestId && selectedBase.value?.id === base.id) {
      selectedContent.value = result
    }
  } catch (reason) {
    if (requestId === contentRequestId) contentError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === contentRequestId) contentLoading.value = false
  }
}

async function retryTextContent(): Promise<void> {
  if (contentDocument.value) await openTextContent(contentDocument.value)
}

function clearContent(): void {
  contentRequestId += 1
  contentVisible.value = false
  contentDocument.value = null
  selectedContent.value = null
  contentError.value = null
  contentLoading.value = false
}

function changeBasePage(value: number): void {
  basePage.value = value
  void loadKnowledgeBases()
}

function changeBasePageSize(value: number): void {
  basePage.value = 1
  basePageSize.value = value
  void loadKnowledgeBases()
}

function changeDocumentPage(value: number): void {
  documentPage.value = value
  void loadDocuments()
}

function changeDocumentPageSize(value: number): void {
  documentPage.value = 1
  documentPageSize.value = value
  void loadDocuments()
}

onMounted(() => {
  void loadKnowledgeBases()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="知识库管理" description="查看平台知识库及其文档内容">
      <template #actions>
        <el-button :loading="loading" @click="loadKnowledgeBases">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadKnowledgeBases">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="knowledgeBases" row-key="id" class="management-table">
          <el-table-column prop="name" label="知识库名称" min-width="180" />
          <el-table-column prop="userId" label="用户 ID" width="100" />
          <el-table-column label="描述" min-width="220">
            <template #default="{ row }">{{ row.description || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">{{ baseStatusLabels[row.status] }}</template>
          </el-table-column>
          <el-table-column label="索引状态" width="120">
            <template #default="{ row }">{{ formatIndexState(row) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row }">
              <el-button
                :data-test="`knowledge-documents-${row.id}`"
                text
                type="primary"
                @click="openDocuments(row)"
              >
                查看文档
              </el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无知识库数据</span></template>
        </el-table>
      </div>
      <div class="pagination-row">
        <el-pagination
          :current-page="basePage"
          :page-size="basePageSize"
          :page-sizes="[20, 50, 100]"
          :total="baseTotal"
          layout="total, sizes, prev, pager, next"
          @current-change="changeBasePage"
          @size-change="changeBasePageSize"
        />
      </div>
    </article>

    <el-drawer
      v-model="documentsVisible"
      :title="documentsTitle"
      size="720px"
      :append-to-body="false"
      @close="clearDocuments"
    >
      <div v-if="documentsError" class="inline-error" role="alert">
        {{ documentsError }}
        <el-button text type="danger" size="small" @click="loadDocuments">重试</el-button>
      </div>
      <div v-loading="documentsLoading" class="drawer-table">
        <el-table :data="documents" row-key="id" class="management-table">
          <el-table-column prop="title" label="标题" min-width="170" />
          <el-table-column label="来源" width="80">
            <template #default="{ row }">{{ sourceTypeLabels[row.sourceType] }}</template>
          </el-table-column>
          <el-table-column prop="fileId" label="文件 ID" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">{{ documentStatusLabels[row.status] }}</template>
          </el-table-column>
          <el-table-column prop="chunkCount" label="分块数" width="80" />
          <el-table-column label="更新时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="110">
            <template #default="{ row }">
              <el-button
                v-if="row.sourceType === 'TEXT'"
                :data-test="`knowledge-document-content-${row.id}`"
                text
                type="primary"
                @click="openTextContent(row)"
              >
                查看内容
              </el-button>
              <span v-else class="muted-action">文件文档</span>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无文档数据</span></template>
        </el-table>
      </div>
      <div class="pagination-row">
        <el-pagination
          :current-page="documentPage"
          :page-size="documentPageSize"
          :page-sizes="[20, 50, 100]"
          :total="documentTotal"
          layout="total, sizes, prev, pager, next"
          @current-change="changeDocumentPage"
          @size-change="changeDocumentPageSize"
        />
      </div>
    </el-drawer>

    <el-drawer
      v-model="contentVisible"
      :title="selectedContent?.title ?? '文档内容'"
      size="720px"
      :append-to-body="false"
      @close="clearContent"
    >
      <div v-loading="contentLoading" class="document-content-panel">
        <div v-if="contentError" class="inline-error" role="alert">
          {{ contentError }}
          <el-button text type="danger" size="small" @click="retryTextContent">重试</el-button>
        </div>
        <pre v-else-if="selectedContent" class="document-content">{{ selectedContent.content }}</pre>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.management-page {
  max-width: 1480px;
  margin: 0 auto;
}

.management-panel {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.table-scroll,
.drawer-table {
  overflow-x: auto;
}

.management-table {
  min-width: 1080px;
}

.inline-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--color-danger);
  font-size: 12px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.empty-state,
.muted-action {
  color: var(--color-text-muted);
}

.muted-action {
  font-size: 12px;
}

.document-content-panel {
  min-height: 360px;
}

.document-content {
  max-height: 68vh;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
