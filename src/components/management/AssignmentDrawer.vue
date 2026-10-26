<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AssignmentGroup } from '@/types/management'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    groups: AssignmentGroup[]
    selectedIds: number[]
    searchPlaceholder?: string
  }>(),
  { searchPlaceholder: '搜索权限' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [ids: number[]]
}>()

const search = ref('')
const localSelectedIds = ref<number[]>([])

function syncSelection(): void {
  localSelectedIds.value = [...props.selectedIds]
}

watch(() => props.modelValue, (open) => {
  if (open) syncSelection()
})
watch(() => props.selectedIds, syncSelection, { deep: true, immediate: true })

const visibleGroups = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return props.groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        !query || `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.options.length > 0)
})

const selectedCount = computed(() => localSelectedIds.value.length)

function isGroupSelected(group: AssignmentGroup): boolean {
  return group.options.length > 0 && group.options.every((option) => localSelectedIds.value.includes(option.id))
}

function toggleGroup(group: AssignmentGroup, checked: boolean): void {
  const ids = new Set(localSelectedIds.value)
  for (const option of group.options) {
    if (checked) ids.add(option.id)
    else ids.delete(option.id)
  }
  localSelectedIds.value = [...ids]
}

function handleGroupChange(group: AssignmentGroup, value: unknown): void {
  toggleGroup(group, Boolean(value))
}

function close(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-drawer :model-value="modelValue" :title="title" size="420px" :teleported="false" @close="close">
    <div class="assignment-body">
      <el-input v-model="search" :placeholder="searchPlaceholder" clearable />
      <div class="assignment-summary">已选择 {{ selectedCount }} 项</div>
      <div v-if="visibleGroups.length === 0" class="empty-state">没有匹配的选项</div>
      <section v-for="group in visibleGroups" :key="group.id" class="assignment-group">
        <div class="group-head">
          <strong>{{ group.label }}</strong>
          <el-checkbox
            :model-value="isGroupSelected(group)"
            @change="handleGroupChange(group, $event)"
          >
            全选
          </el-checkbox>
        </div>
        <el-checkbox-group v-model="localSelectedIds" class="option-list">
          <el-checkbox v-for="option in group.options" :key="option.id" :value="option.id">
            <span>{{ option.label }}</span>
            <small v-if="option.description">{{ option.description }}</small>
          </el-checkbox>
        </el-checkbox-group>
      </section>
    </div>
    <template #footer>
      <div class="drawer-footer">
        <el-button data-test="assignment-close" @click="close">取消</el-button>
        <el-button data-test="assignment-save" type="primary" @click="emit('save', [...localSelectedIds])">
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.assignment-body {
  display: grid;
  gap: 14px;
}

.assignment-summary {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.assignment-group {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.option-list {
  display: grid;
  gap: 7px;
}

.option-list :deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
  align-items: flex-start;
}

.option-list span {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
}

.option-list small {
  color: var(--color-text-muted);
  font-size: 11px;
}

.empty-state {
  padding: 28px 0;
  color: var(--color-text-muted);
  text-align: center;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
