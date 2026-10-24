<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EChartsType } from 'echarts'

const props = defineProps<{
  successRate: number
  successfulCalls: number
  failedCalls: number
}>()
const chartElement = ref<HTMLDivElement>()
let chart: EChartsType | null = null

const totalCalls = computed(() => props.successfulCalls + props.failedCalls)

function renderChart(): void {
  if (!chart || totalCalls.value === 0) return
  chart.setOption({
    color: ['#5364d5', '#f0a24f'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, data: ['成功', '失败'] },
    series: [
      {
        type: 'pie',
        radius: ['55%', '76%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'center',
          formatter: `${Math.round(props.successRate * 100)}%\n成功率`,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 26,
        },
        labelLine: { show: false },
        data: [
          { name: '成功', value: props.successfulCalls },
          { name: '失败', value: props.failedCalls },
        ],
      },
    ],
  })
}

function resizeChart(): void {
  chart?.resize()
}

onMounted(async () => {
  await nextTick()
  if (!chartElement.value || totalCalls.value === 0) return
  chart = echarts.init(chartElement.value)
  renderChart()
  window.addEventListener('resize', resizeChart)
})

watch(
  () => [props.successRate, props.successfulCalls, props.failedCalls],
  () => {
    if (!chart && totalCalls.value > 0 && chartElement.value) {
      chart = echarts.init(chartElement.value)
      window.addEventListener('resize', resizeChart)
    }
    renderChart()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="success-chart">
    <div v-if="totalCalls === 0" class="chart-state">暂无 AI 调用数据</div>
    <div ref="chartElement" class="chart-canvas" aria-label="AI 调用成功率图" />
    <div class="success-summary" aria-label="AI 调用成功和失败数量">
      <span><i class="legend-dot success-dot" />成功 {{ successfulCalls.toLocaleString('zh-CN') }}</span>
      <span><i class="legend-dot failure-dot" />失败 {{ failedCalls.toLocaleString('zh-CN') }}</span>
    </div>
  </div>
</template>

<style scoped>
.success-chart {
  position: relative;
  min-height: 260px;
}

.chart-canvas {
  width: 100%;
  height: 230px;
}

.chart-state {
  position: absolute;
  z-index: 1;
  inset: 0 0 30px;
  display: grid;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.success-summary {
  display: flex;
  justify-content: center;
  gap: 18px;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.legend-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
}

.success-dot {
  background: var(--color-primary);
}

.failure-dot {
  background: var(--color-warning);
}
</style>
