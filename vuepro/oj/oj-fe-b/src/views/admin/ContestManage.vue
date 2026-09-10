<template>
  <div class="page-container">
    <div class="page-header">
      <div class="search-box">
        <el-input v-model="keyword" placeholder="搜索竞赛名称" clearable style="width: 240px" />
        <el-button type="primary">查询</el-button>
      </div>
      <el-button type="primary">+ 新增竞赛</el-button>
    </div>

    <div class="table-card">
      <el-table :data="contestList" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="竞赛名称" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="startTime" label="开始时间" width="180" />
        <el-table-column prop="endTime" label="结束时间" width="180" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default>
            <el-button link type="primary" size="small">编辑</el-button>
            <el-button link type="danger" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="empty-tip" v-if="!contestList.length">
        暂无竞赛数据
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const keyword = ref('')
// 待接入后端接口
const contestList = ref([])
</script>

<style lang="scss" scoped>
.page-container {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .search-box {
      display: flex;
      gap: 10px;
    }
  }

  .table-card {
    padding: 16px;
    background: #ffffff;
    border-radius: 8px;

    .empty-tip {
      padding: 40px 0;
      text-align: center;
      color: #999999;
      font-size: 14px;
    }
  }
}
</style>
