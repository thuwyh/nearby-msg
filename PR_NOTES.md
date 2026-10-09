## 完成任务
T1–T10 全部完成。

## 演示步骤
1. **T2**：用户视角 → 人物列表点 Jordan「Message」→ 发消息；切到师傅 Jordan 回复；Sam 看不到。
2. **T1**：输入框下方选图（可用 sample-assets/leaking-sink.png）→ 发送 → 点缩略图看大图。GIF 或超过 2 MiB 会报错。
3. **T5**：消息下点「Reply」→ 输入框上方显示引用预览，可取消 → 发送后带引用。
4. **T3**：自己的消息点「Recall」→ 双方显示 "Message recalled"，引用、图片、搜索里也随之消失。
5. **T4**：对话列表显示红色未读数。打开对话并滚到底部，未读数清零。
6. **T8**：对话顶部搜索框输入关键词 → 列出结果 → 点结果跳回原消息并高亮。
7. **T6**：打一半字 → 切换对话或刷新，草稿还在；切换身份看不到。
8. **T7**：Simulation controls 选「保存前失败」→ 发送 → 「Not sent · Retry」→ 重试，对方只收到一条。选「保存后确认丢失」时，页面会自动认出已保存的消息。
9. **T9**：Alex 在 Jordan 对话里点「Block」→ Jordan 发消息时提示被屏蔽；点「Unblock」后可以再发，被拒的消息不会补发。
10. **T10**：Alex 点「Invite Nearby Support」→ 平台视角能看到历史并回复，三方都能看到。

## 接口（基本按 CONTRACT.md 的建议）
- `POST /api/conversations {recipientId}`，对话 id 固定为 `pair-customer-pro-N`
- `POST /api/messages/:id/recall`
- 发消息可带 `clientMessageId`、`image:{name,dataUrl}`、`replyToId`；重试返回原消息(200)，同 ID 不同内容返回 409
- `POST /api/conversations/:id/read {throughMessageId}`；`state.conversations[].unreadCount`
- `GET .../messages?q=`
- `POST /api/people/:id/block {blocked}`；`state.blocked`
- `POST /api/conversations/:id/escalate`

## 测试
- `npm test`：9 组后端测试，每个任务都有，并包含撤回与图片、引用、搜索的组合情况
- `npm run typecheck`
- 用无头 Chrome 跑过主要流程，没有页面报错

## 已知缺口
- 前端没有提交自动化测试（只临时跑过脚本）
- 「已读」用的是滚到底部，没按每条消息是否进入屏幕来算
- 图片以 base64 存在 SQLite 里，适合演示，不适合生产
- 发送失败的图片会暂存在浏览器本地，几张大图可能超过浏览器的存储上限
