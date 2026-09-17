# 题目表单组件

`ProblemDrawer` 是题目新增/编辑功能的入口。页面仅负责控制显隐、加载编辑详情并提交；表单结构、验证和编辑器行为均由 `ProblemFormMetadata` JSON 决定。

```vue
<ProblemDrawer
  v-model="visible"
  mode="add"
  :metadata="metadata"
  :initial-values="initialValues"
  :submitting="submitting"
  :submit-error="submitError"
  @submit="saveProblem"
  @clear-submit-error="submitError = ''"
/>
```

## 组件接口

| 组件                | 主要属性                                                                       | 事件 / 暴露方法                                                                |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `ProblemDrawer`     | `modelValue`、`mode`、`metadata`、`initialValues`、`submitting`、`submitError` | `update:modelValue`、`submit(values)`、`clear-submit-error`；`discardDraft()`  |
| `ProblemForm`       | `metadata`、`initialValues`                                                    | `change(values)`、`autosave(values)`；`validate()`、`getValues()`              |
| `FormField`         | `field`、`modelValue`、`formValues`、`error`                                   | `update:modelValue`、`input`、`blur`、`autosave`                               |
| `MarkdownEditor`    | `modelValue`、`placeholder`、`minHeight`、`maxLength`、`disabled`              | `update:modelValue`、`blur`                                                    |
| `MarkdownRenderer`  | `content`、`emptyText`                                                         | 无                                                                             |
| `CodeEditor`        | `modelValue`、`language`、`height`、`minimap`、`autosaveSeconds`、`plugins`    | `update:modelValue`、`update:language`、`save(value, reason)`、`ready(editor)` |
| `ValidationMessage` | `message`、`help`                                                              | 无                                                                             |

## 元数据与扩展

- 内置字段类型：`text`、`textarea`、`markdown`、`select`、`multiselect`、`radio`、`checkbox`、`date`、`time`、`number`、`code`。
- 验证规则：必填、最短/最长、数值范围、邮箱/URL/手机号、自定义正则。
- 新字段类型通过 `registerProblemFieldRenderer(type, component)` 注册；渲染器接收 `field`、`modelValue`、`formValues`。
- 新题目类型可实现 `ProblemTypeExtension`，向基础元数据追加字段或在提交前归一数据。
- Monaco 插件实现 `CodeEditorPlugin.setup({ monaco, editor })`；返回的清理函数会在组件销毁时调用。
- `submit: false` 的字段是界面偏好，不应进入后端 DTO。当前 `language` 用于控制编辑器语法模式。

`markdown` 字段使用 CodeMirror 提供 Markdown 语法高亮、撤销/重做、搜索和快捷键，保存原始 Markdown 而不是预览 HTML。用户端或竞赛模块展示内容时应复用 `MarkdownRenderer.vue` 或 `renderMarkdown()`，两者都会禁用原始 HTML 并使用 DOMPurify 二次净化。

提交期间 `submitting` 会锁定取消、关闭、遮罩和 ESC 操作，防止重复请求。业务或网络失败应把错误消息传入 `submitError`，抽屉会保留当前输入并展示错误；修改任意字段时通过 `clear-submit-error` 清除旧错误。新增成功后，管理页面先将本地记录插入第一页首位，再刷新列表补全服务端生成的 ID、创建人和创建时间。

服务端配置位于 `oj-system/src/main/resources/question-form-metadata.json`，前端同版本兜底位于 `src/config/problemFormMetadata.ts`。更新字段时应同步提升 `version`，避免恢复不兼容草稿。
