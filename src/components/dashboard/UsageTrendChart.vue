<script setup lang="ts">
import * as echarts from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EChartsType } from 'echarts'
import type { DashboardTrendItem } from '@/types/dashboard'

const props = defineProps<{
  items: DashboardTrendItem[]
  loading: boolean
}>()
const chartElement = ref<HTMLDivElement>()
let chart: EChartsType | null = null

function renderChart(): void {
  if (!chart) return
  chart.setOption({
    color: ['#5364d5', '#2ca882'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['活跃用户', '新会话'] },
    grid: { top: 16, right: 18, bottom: 42, left: 44 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.items.map((item) => item.date),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '活跃用户',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: props.items.map((item) => item.activeUsers),
      },
      {
        name: '新会话',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: props.items.map((item) => item.newSessions),
      },
    ],
  })
}

function resizeChart(): void {
  chart?.resize()
}

onMounted(async () => {
  await nextTick()
  if (!chartElement.value) return
  chart = echarts.init(chartElement.value)
  renderChart()
  window.addEventListener('resize', resizeChart)
})

watch(() => props.items, renderChart, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="trend-chart">
    <div v-if="loading" class="chart-state">正在加载趋势数据…</div>
    <div v-else-if="!items.length" class="chart-state">暂无趋势数据</div>
    <div ref="chartElement" class="chart-canvas" aria-label="平台使用趋势图" />
  </div>
</template>

<style scoped>
.trend-chart {
  position: relative;
  min-height: 260px;
}

.chart-canvas {
  width: 100%;
  height: 260px;
}

.chart-state {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 13px;
  pointer-events: none;
}
</style>
