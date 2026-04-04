<script setup lang="ts">
defineProps<{
  label: string
  color?: 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink'
}>()

const colorMap = {
  gray:   'bg-gray-700/60 text-gray-300',
  blue:   'bg-blue-900/50 text-blue-300',
  green:  'bg-green-900/50 text-green-300',
  red:    'bg-red-900/50 text-red-300',
  yellow: 'bg-yellow-900/50 text-yellow-300',
  purple: 'bg-purple-900/50 text-purple-300',
  pink:   'bg-pink-900/50 text-pink-300',
}
</script>

<template>
  <span :class="['badge', colorMap[color ?? 'gray']]">{{ label }}</span>
</template>
