# 用户端前后端联调

## 启动

```powershell
npm install
npm run dev
```

默认 `/dev-api` 通过 Vite 代理到 `http://127.0.0.1:19090/friend`。如网关地址不同，在启动前设置：

```powershell
$env:VITE_API_PROXY_TARGET = 'http://你的网关地址/friend'
npm run dev
```

网关、oj-friend、oj-judge 应已启动并注册到 Nacos，RabbitMQ、数据库及题库依赖服务应可用。网关响应 HTTP 503 时，先检查下游服务注册与可用状态。生产部署通过 `VITE_API_BASE_URL` 配置可访问的 friend 服务前缀；Vite 开发代理不参与生产请求。

## 提交与判题契约

- `POST /user/question/rabbit/submit`：提交 `{ questionId, programType: 0, userCode, examId? }`。ID 保持字符串，练习场景省略 examId。响应 `code=1000` 表示已入队，不能作为通过结果。
- `GET /user/question/exe/result`：使用相同 questionId、examId 和提交请求发出前记录的 currentTime 查询。时间格式为上海时区 `yyyy-MM-dd HH:mm:ss`，与后端数据库时间保持一致。
- `pass=3` 为判题中，`pass=2` 继续等待，`pass=1` 通过，`pass=0` 未通过。异常结构展示错误，不能默认为通过。
- `/judge/doJudgeJavaCode` 由 RabbitMQ 消费者调用，前端不直接构造包含测试用例、用户 ID 和资源限制的内部判题请求。
- 前端展示 exeMessage 和 userExeResultList 的 input、output、exeOutput。现有结果接口未返回耗时、内存和分数，页面不生成这些数据。

轮询每两秒查询一次，每轮最多 60 次，短暂网络故障最多连续重试三次。查询失败或等待结束可“继续查询结果”，该操作不会重复提交代码。退出或切题会取消查询，旧响应不更新新题页面。后端当前通过时间筛选最新结果，尚未返回唯一提交 ID；后续若增加提交 ID，应改用 ID 查询以避免时钟差异及多窗口同时提交混淆。

## 验证

```powershell
npm test
npm run lint
npm run build
```

judge.test.js 覆盖状态解析、日期格式、网络重试、等待上限和取消；judgeRequest.test.js 使用本地 HTTP 测试服务验证真实 Axios 请求路径、认证头、Java 提交参数、竞赛/练习 ID 及异步结果查询。这些测试不代替真实 RabbitMQ 和 Java 沙箱验收。

真实服务验收：登录用户端，选择含 Java 默认代码的题目，提交正确解法确认通过；再提交输出错误及编译错误的代码，确认测试点差异和编译信息。最后检查竞赛场景发送相同 examId，查询错误后恢复不重复发送 POST。
