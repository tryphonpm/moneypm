<script setup lang="ts">
defineProps<{
  label: string
  color?: 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink'
}>()

const colorMap = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink:   'bg-pink-100 text-pink-700',
}
</script>

<template>
  <span :class="['badge', colorMap[color ?? 'gray']]">{{ label }}</span>
</template>
