<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import { getDashboardOverview, getDashboardTrend } from '@/api/dashboard'
import AiSuccessChart from '@/components/dashboard/AiSuccessChart.vue'
import DateRangePicker from '@/components/dashboard/DateRangePicker.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import UsageTrendChart from '@/components/dashboard/UsageTrendChart.vue'
import type { AsyncState, DashboardOverview, DashboardTrendItem, DateRange } from '@/types/dashboard'
import { getDefaultDateRange, validateDateRange } from '@/utils/date'

const range = ref<DateRange>(getDefaultDateRange(new Date()))
const overviewState = reactive<AsyncState<DashboardOverview>>({ data: null, loading: false, error: null })
const trendState = reactive<AsyncState<DashboardTrendItem[]>>({ data: null, loading: false, error: null })

const numberFormatter = new Intl.NumberFormat('zh-CN')

function formatNumber(value: number | undefined): string {
  return value === undefined ? '—' : numberFormatter.format(value)
}

function formatTokens(value: number | undefined): string {
  if (value === undefined) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return formatNumber(value)
}

function formatRate(value: number | undefined): string {
  return value === undefined ? '—' : `${Math.round(value * 100)}%`
}

function setDateError(message: string): void {
  overviewState.error = message
  trendState.error = message
}

async function loadDashboard(): Promise<void> {
  const validationError = validateDateRange(range.value)
  if (validationError) {
    setDateError(validationError)
    return
  }

  overviewState.loading = true
  trendState.loading = true
  overviewState.error = null
  trendState.error = null
  const overviewPromise = getDashboardOverview(range.value)
  const trendPromise = getDashboardTrend(range.value)
  const [overviewResult, trendResult] = await Promise.allSettled([overviewPromise, trendPromise])
  overviewState.loading = false
  trendState.loading = false

  if (overviewResult.status === 'fulfilled') overviewState.data = overviewResult.value
  else overviewState.error = getApiErrorMessage(overviewResult.reason)

  if (trendResult.status === 'fulfilled') trendState.data = trendResult.value
  else trendState.error = getApiErrorMessage(trendResult.reason)
}

async function retryOverview(): Promise<void> {
  overviewState.loading = true
  overviewState.error = null
  try {
    overviewState.data = await getDashboardOverview(range.value)
  } catch (error) {
    overviewState.error = getApiErrorMessage(error)
  } finally {
    overviewState.loading = false
  }
}

async function retryTrend(): Promise<void> {
  trendState.loading = true
  trendState.error = null
  try {
    trendState.data = await getDashboardTrend(range.value)
  } catch (error) {
    trendState.error = getApiErrorMessage(error)
  } finally {
    trendState.loading = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <section class="dashboard-page">
    <header class="page-head">
      <div>
        <h1>运营概览</h1>
        <p>查看平台近期运行与使用情况</p>
      </div>
      <DateRangePicker
        v-model="range"
        @confirm="loadDashboard"
        @invalid="setDateError"
      />
    </header>

    <div v-if="overviewState.error" class="inline-error" role="alert">
      {{ overviewState.error }}
      <el-button text type="danger" size="small" @click="retryOverview">重试概览</el-button>
    </div>

    <div class="metrics-grid">
      <MetricCard label="总用户" :value="formatNumber(overviewState.data?.totalUsers)" />
      <MetricCard label="会话总量" :value="formatNumber(overviewState.data?.totalSessions)" />
      <MetricCard label="AI 调用" :value="formatNumber(overviewState.data?.aiCalls)" />
      <MetricCard label="Token 消耗" :value="formatTokens(overviewState.data?.totalTokens)" />
    </div>

    <div class="dashboard-grid">
      <article class="dashboard-panel trend-panel">
        <div class="panel-head">
          <div>
            <h2>平台使用趋势</h2>
            <span>按日统计活跃用户和新会话</span>
          </div>
          <el-button v-if="trendState.error" text type="danger" size="small" @click="retryTrend">
            重试
          </el-button>
        </div>
        <div v-if="trendState.error" class="panel-error" role="alert">
          趋势数据加载失败
        </div>
        <UsageTrendChart
          v-else
          :items="trendState.data ?? []"
          :loading="trendState.loading"
        />
      </article>

      <article class="dashboard-panel success-panel">
        <div class="panel-head">
          <div>
            <h2>AI 调用成功率</h2>
            <span>{{ formatNumber(overviewState.data?.aiCalls) }} 次调用</span>
          </div>
        </div>
        <AiSuccessChart
          :success-rate="overviewState.data?.aiSuccessRate ?? 0"
          :successful-calls="overviewState.data?.successfulAiCalls ?? 0"
          :failed-calls="overviewState.data?.failedAiCalls ?? 0"
        />
      </article>
    </div>
  </section>
</template>

<style scoped>
.dashboard-page {
  max-width: 1480px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 24px;
  letter-spacing: -0.02em;
}

.page-head p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.9fr);
  gap: 14px;
  margin-top: 14px;
}

.dashboard-panel {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  font-size: 14px;
  font-weight: 650;
}

.panel-head span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.inline-error,
.panel-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--color-danger);
  font-size: 12px;
}

.panel-error {
  justify-content: center;
  min-height: 260px;
  margin: 0;
  color: var(--color-text-muted);
}

@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
