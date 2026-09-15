# oj-fe-b

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## 主题行为与验证

主题菜单仅支持手动选择浅色或深色。没有有效偏好时默认浅色；旧版保存的 `system` 值也回退为浅色。操作系统主题变化、页面恢复均不改变用户选择。

`src/utils/theme.js` 将选择保存到 `localStorage['admin-theme-mode']`，刷新和重新访问时恢复。首屏内联脚本使用相同规则，在 Vue 挂载前同步 `html.dark`、`color-scheme` 和背景，避免主题闪烁。存储受限时仍可在当前页面手动切换，但无法跨刷新保存偏好。

主题模块不查询或监听 `prefers-color-scheme`。保留 `prefers-reduced-motion` 检测以尊重减少动态效果的设置，销毁及 HMR 时清理过渡计时器。菜单关闭/销毁时清理焦点计时器。

### 自动化测试

```sh
npm test
npx playwright install chromium firefox webkit
npm run test:e2e
npm run build
```

- `test/theme.test.js`：手动切换、存储恢复、旧偏好回退、拒绝无效模式、不注册系统监听、存储/API 受限、过渡清理、首屏与运行时一致。
- `e2e/theme.spec.js`：菜单仅有两个选项、系统变化不影响页面、手动切换、刷新/新页面恢复、旧偏好回退及异常降级。

E2E 自动构建并启动 `127.0.0.1:4175` 上的生产预览服务，不需要后端。测试配置覆盖 Chromium、Firefox、WebKit；WebKit 引擎不能替代 Safari 实机验收。本机 Windows 中 Firefox 曾因 `mozglue` 程序集无法加载而报 `spawn UNKNOWN`，需要修复浏览器运行环境后执行 `npm run test:e2e -- --project=firefox`；可用引擎单独执行 `npm run test:e2e -- --project=chromium --project=webkit`。

### 人工验收

| 操作 | 预期结果 |
| --- | --- |
| 清除主题偏好，系统深色时打开页面 | 页面默认浅色，菜单仅有浅色/深色 |
| 手动选择深色或浅色，反复切换操作系统主题 | 页面保持用户选择，存储为 `dark` 或 `light` |
| 刷新、关闭页面后重新访问 | 恢复手动偏好，首帧颜色一致 |
| 旧版存储值为 `system` 时重新访问 | 回退浅色，可重新选择并保存手动偏好 |
| 浏览器阻止本地存储 | 当前页面可切换，刷新后默认浅色 |
| 启用减少动态效果后切换 | 颜色更新，不启用主题过渡 |
