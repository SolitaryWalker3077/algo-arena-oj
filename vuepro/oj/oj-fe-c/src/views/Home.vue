<template>
  <div class="oj-main-layout">
    <div class="oj-main-layout-header">
      <div class="oj-main-layout-nav">
        <Navbar></Navbar>
      </div>
    </div>
    <div v-if="$route.meta.showBanner" class="banner-wrap">
      <img
        src="@/assets/images/log-banner.png"
        class="banner-img"
        alt="OJ 竞技场"
      >
    </div>
  </div>
  <RouterView v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" :key="$route.fullPath" />
    </Transition>
  </RouterView>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue'
</script>

<style lang="scss" scoped>
.el-main {
  padding: 0;
}

.oj-main-layout {
  // background-color: #f7f7f7;
  padding-top: 20px;

  .banner-wrap {
    max-width: 1520px;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 16px;
  }

  .banner-img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 16px;
    object-fit: cover;
  }

  .oj-main-layout-header {
    height: 60px;
    position: absolute;
    width: 100%;
    background: #fff;
    left: 0;
    top: 0;
    z-index: 3;
    overflow: hidden;
  }

  .oj-main-layout-nav {
    max-width: 1520px;
    min-width: 100%;
    margin: 0 auto;
    height: 60px;
    background: #fff;
  }

}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@media (max-width: 760px) {
  .oj-main-layout {
    .banner-wrap { border-radius: 10px; }
    .banner-img {
      min-height: 0;
      height: auto;
      object-fit: contain;
    }
  }
}
</style>
