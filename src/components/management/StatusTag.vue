<script setup lang="ts">
defineProps<{
  status: number
}>()
</script>

<template>
  <el-tag :type="status === 1 ? 'success' : 'info'" size="small">
    {{ status === 1 ? '启用' : '停用' }}
  </el-tag>
</template>
