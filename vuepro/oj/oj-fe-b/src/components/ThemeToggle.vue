<template>
  <div class="theme-toggle">
    <el-dropdown
      ref="dropdownRef"
      trigger="click"
      placement="bottom-end"
      popper-class="theme-toggle__popper"
      @visible-change="onVisibleChange"
    >
      <button
        ref="triggerRef"
        type="button"
        class="theme-toggle__btn"
        :aria-label="triggerAriaLabel"
        :title="triggerAriaLabel"
        aria-haspopup="menu"
        :aria-expanded="open"
      >
        <el-icon :size="18">
          <component :is="triggerIcon" />
        </el-icon>
      </button>
      <template #dropdown>
        <!-- 原生语义菜单：el-dropdown-item 会将 role 硬编码为 menuitem，无法表达单选语义 -->
        <div ref="menuRef" class="theme-toggle__menu" role="menu" aria-label="选择主题模式" @keydown="onMenuKeydown">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            role="menuitemradio"
            :aria-checked="themeMode === opt.value"
            :class="['theme-toggle__menu-item', { 'is-active': themeMode === opt.value }]"
            @click="handleSelect(opt.value)"
          >
            <el-icon class="theme-toggle__option-icon">
              <component :is="opt.icon" />
            </el-icon>
            <span class="theme-toggle__option-label">{{ opt.label }}</span>
            <el-icon v-if="themeMode === opt.value" class="theme-toggle__check" aria-hidden="true">
              <Check />
            </el-icon>
          </button>
        </div>
      </template>
    </el-dropdown>
    <!-- 屏幕阅读器状态播报：用户切换主题时朗读 -->
    <span class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Sunny, Moon, Check } from '@element-plus/icons-vue'
import { useTheme, THEME_MODE } from '@/utils/theme'

const { themeMode, setThemeMode } = useTheme()

const dropdownRef = ref(null)
const triggerRef = ref(null)
const menuRef = ref(null)
const open = ref(false)
const liveMessage = ref('')
let focusTimer = null

onBeforeUnmount(() => clearTimeout(focusTimer))

const options = [
  { value: THEME_MODE.LIGHT, label: '浅色模式', icon: Sunny },
  { value: THEME_MODE.DARK, label: '深色模式', icon: Moon },
]

const labelOf = (value) => options.find((o) => o.value === value)?.label || ''
const triggerIcon = computed(() => (themeMode.value === THEME_MODE.DARK ? Moon : Sunny))

const triggerAriaLabel = computed(() => `主题切换，当前为${labelOf(themeMode.value)}`)

const announce = (mode) => {
  liveMessage.value = `已切换为${labelOf(mode)}`
}

const handleSelect = (mode) => {
  clearTimeout(focusTimer)
  setThemeMode(mode)
  announce(mode)
  // 自定义菜单内容不会被 el-dropdown 自动关闭
  dropdownRef.value?.handleClose?.()
}

const onVisibleChange = (visible) => {
  clearTimeout(focusTimer)
  open.value = visible
  if (visible) {
    // 打开后将焦点移至当前选中项，保证键盘/读屏用户可直接操作；
    // 等待 popper 进入动画使菜单可见后再聚焦
    focusTimer = setTimeout(() => {
      // 关闭或销毁后不能再移动焦点；rect 检测也适用于 offsetParent 为 null 的定位元素。
      const menu = menuRef.value
      if (!open.value || !menu?.getClientRects().length) return
      const target = menu.querySelector('.is-active') || menu.querySelector('.theme-toggle__menu-item')
      target?.focus({ preventScroll: true })
    }, 80)
  }
}

// 标准菜单键盘交互：Esc 关闭并回焦触发按钮，方向键/Home/End 循环移动
const onMenuKeydown = (e) => {
  const menu = e.currentTarget
  const items = Array.from(menu.querySelectorAll('.theme-toggle__menu-item'))
  const index = items.indexOf(document.activeElement)

  if (e.key === 'Escape') {
    e.preventDefault()
    dropdownRef.value?.handleClose?.()
    triggerRef.value?.focus()
    return
  }

  let next = -1
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1 + items.length) % items.length
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
  if (e.key === 'Home') next = 0
  if (e.key === 'End') next = items.length - 1

  if (next >= 0) {
    e.preventDefault()
    items[next]?.focus()
  }
}

</script>

<style lang="scss" scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--app-text-regular);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      background: var(--app-hover-bg);
      color: var(--app-brand);
    }

    &:focus-visible {
      outline: 2px solid var(--app-brand);
      outline-offset: 1px;
    }
  }
}
</style>

<!-- 下拉层被 teleport 到 body，需使用非 scoped 样式，统一用 popper-class 命名空间隔离 -->
<style lang="scss">
.theme-toggle__popper {
  // 清除 el-dropdown 默认 popper 背景/内边距，面板样式由内部自定义菜单提供
  background: transparent !important;
  border: none !important;
}

.theme-toggle__menu {
  min-width: 168px;
  padding: 6px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  box-shadow: var(--app-shadow-strong);

  .theme-toggle__menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--app-text-regular);
    font-size: 14px;
    line-height: 1.4;
    text-align: left;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    .theme-toggle__option-label {
      flex: 1;
    }

    .theme-toggle__check {
      color: var(--app-brand);
    }

    &:hover {
      background: var(--app-hover-bg);
      color: var(--app-brand);
    }

    &:focus-visible {
      outline: 2px solid var(--app-brand);
      outline-offset: -2px;
    }

    &.is-active {
      color: var(--app-brand);
      font-weight: 600;
    }
  }
}
</style>
