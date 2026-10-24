<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { DateRange } from '@/types/dashboard'
import { validateDateRange } from '@/utils/date'

type ShortcutDays = 7 | 30 | 90

const props = defineProps<{ modelValue: DateRange }>()
const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  confirm: []
  invalid: [message: string]
}>()

const pickerValue = computed<string[]>({
  get: () => [props.modelValue.from, props.modelValue.to],
  set: (value) => {
    if (value.length === 2 && value[0] && value[1]) {
      emit('update:modelValue', { from: value[0], to: value[1] })
    }
  },
})

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function selectShortcut(days: ShortcutDays): void {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  emit('update:modelValue', { from: formatLocalDate(start), to: formatLocalDate(end) })
  emit('confirm')
}

function confirm(): void {
  const message = validateDateRange(props.modelValue)
  if (message) {
    emit('invalid', message)
    ElMessage.warning(message)
    return
  }
  emit('confirm')
}
</script>

<template>
  <div class="date-range-picker">
    <div class="shortcut-group" aria-label="日期快捷范围">
      <el-button text size="small" @click="selectShortcut(7)">最近 7 天</el-button>
      <el-button text size="small" @click="selectShortcut(30)">最近 30 天</el-button>
      <el-button text size="small" @click="selectShortcut(90)">最近 90 天</el-button>
    </div>
    <el-date-picker
      v-model="pickerValue"
      type="daterange"
      value-format="YYYY-MM-DD"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      :teleported="false"
      aria-label="选择统计日期范围"
    />
    <el-button type="primary" size="small" @click="confirm">查询</el-button>
  </div>
</template>

<style scoped>
.date-range-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.shortcut-group {
  display: flex;
  align-items: center;
}

@media (max-width: 760px) {
  .date-range-picker {
    justify-content: flex-start;
  }

  .date-range-picker :deep(.el-date-editor) {
    width: 100%;
  }
}
</style>
