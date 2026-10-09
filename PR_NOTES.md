## 完成任务
T2 私信师傅 · T3 撤回 · T6 草稿 · T7 失败重试

## 演示步骤
1. 用户视角 → 右侧人物列表点 Jordan「Message」→ 发消息；切到师傅 Jordan 回复；Sam 看不到。
2. 自己的消息点「Recall」→ 双方显示 "Message recalled"，刷新仍在原位。
3. 在 Jordan 对话里打一半字 → 切到 Sam 对话 / 刷新 → 草稿各自保留；切换身份看不到别人的草稿。
4. Simulation controls 选 before-save 或 after-save → 发送 → 出现 "Not sent · Retry" → 点 Retry，对方只收到一条。

## 接口
- `POST /api/conversations {recipientId}` → 同一对人复用 `pair-customer-pro-N`
- `POST /api/messages/:id/recall` → 只有发送者可撤回(403)，原文从数据库抹掉
- 发送加 `clientMessageId`：重试返回原消息(200)，同 ID 不同内容 409

## 测试
`npm test`（node:test，覆盖 T2/T3/T7 后端规则）· `npm run typecheck`

## 未做 / 已知缺口
T1/T4/T5/T8/T9/T10 未做；前端无自动化测试，只手动 + curl 验证。
