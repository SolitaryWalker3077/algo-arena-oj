# 头像上传配置与验收

1. 如果后端已用 `file.oss.downloadUrl` 拼接完整图片 URL，前端无需配置下载前缀；需重新编译并重启 `oj-friend` 使 Java 修改生效。如果接口仍只返回文件名，将 `.env.example` 复制为 `.env.local`，设置 `VITE_AVATAR_BASE_URL` 为真实 OSS 公共下载前缀（包含后端 `pathPrefix` 对应的路径）。例如文件实际位于 `https://cdn.example.com/file/abc.png`，前缀应为 `https://cdn.example.com/file/`。
2. 开发环境 `/dev-api` 通过 Vite 代理到 `/friend`；生产环境将 `VITE_API_BASE_URL` 设为对应网关路径，例如 `/friend`。修改配置后重启开发服务或重新构建。
3. 登录后打开个人中心 → 编辑资料 → 上传头像 → 选择 JPG/PNG/WebP（最大 5 MB）→ 保存资料。
4. 请求顺序：`POST /friend/file/upload`，FormData 字段 `file`；检查 `code: 1000`、`data.success: true` 和非空 `data.name`，再 `PUT /friend/user/head-image/update`，JSON 为 `{ "headImage": "返回的文件名" }`。两次请求均通过现有拦截器添加 `Authorization: Bearer ...`，用户身份由服务端令牌确定，DTO 无需传 userId。multipart boundary 由浏览器生成。
5. 成功后显示“更新头像成功”，个人中心和导航栏立即更新。其他资料有修改时另调用资料编辑接口；若资料保存失败，已成功的头像更新会保留。
6. 检查上传网络失败、服务端业务失败、头像更新失败和登录过期。失败显示“上传头像失败”，保留已选图片并可点“重新保存”；头像更新失败时重试不重复上传文件。登录过期由现有认证流程处理。
7. 检查取消选择、取消编辑、恢复默认头像、连续点击保存、空文件、伪装图片内容和超限文件。浏览器解码失败应拒绝选图。选择文件后、保存前不会上传。
8. 在 Chrome、Firefox、Safari、Edge 及 375px/768px/桌面宽度验收；刷新后头像应由下载前缀和服务端文件名正确还原。

验证命令：`npm run lint`、`npm test`、`npm run build`。
前端文件检查不能代替服务端文件校验和鉴权；本次未修改后端已有代码。

## 自动化联调

`test/avatarRequest.test.js` 使用真实本地 HTTP 服务验证前端请求模块的认证头、multipart boundary、文件字段、更新 JSON、服务器错误、超时、断连及登录失效。它使用模拟后端，不修改真实账号。

真实环境测试：在终端中设置测试账号环境变量 `OJ_TEST_PHONE` 和 `OJ_TEST_CODE`，运行 `node scripts/avatar-smoke.js`。可用 `OJ_TEST_API_URL` 覆盖默认 API 地址 `http://localhost:5173/dev-api`。脚本调用获取验证码接口（仅对测试短信配置运行），使用现有前端 API 模块上传项目默认头像，核对详情/导航头像 URL 及 OSS 文件字节，最后恢复并验证原头像。测试会在 OSS 留下一张测试图片；不输出令牌，不写入凭证。真实服务测试不包含在 `npm test` 中。


也可设置 `OJ_TEST_TOKEN` 复用测试账号已有登录状态，避免重复消耗验证码额度；不要将令牌提交到仓库或写入报告。

## 本次验证结果（2026-10-05）

- lint、36 项自动化测试和生产构建通过。
- 真实本地网关未登录访问上传和头像更新接口均返回 3001。
- 后端重新编译重启后，真实测试账号登录、multipart 上传、头像更新通过。
- 重新获取用户详情与导航信息时头像完整 URL 一致；从 OSS 下载的图片与上传内容逐字节一致。
- 已恢复测试账号原头像并重新读取确认。OSS 留有本次上传的一张默认头像测试文件。
- 浏览器控制工具持续返回 `nodeRepl.fetch request failed`；未完成 Chrome/Firefox/Safari/Edge 的界面交互及移动端视觉实测，构建目标配置不等于这些浏览器已通过实测。
