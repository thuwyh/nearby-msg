import { setupReport } from "/report.js";
import { setupChatMedia } from "/chat-media.js";
const $ = (id) => document.getElementById(id);
const dictionary = {
  messages: ["messages", "消息"],
  local: ["Local demo", "本地模拟"],
  viewAs: ["VIEW AS", "切换视角"],
  customer: ["Customer", "用户"],
  professional: ["Professional", "师傅"],
  platform: ["Platform", "平台"],
  guide: ["Quick guide", "操作指南"],
  story: [
    "Alex needs help with a leaking kitchen sink. Jordan and Sam are plumbers on Nearby; Nearby Support is the platform’s customer service team.",
    "Alex 家的厨房水槽漏水，需要找师傅维修。Jordan 和 Sam 是平台上的水管工，Nearby 客服代表平台。",
  ],
  step1: [
    "As Customer, send a text message to Nearby Support below.",
    "在「用户」视角，向下方的 Nearby 客服发送一条文字消息。",
  ],
  step2: [
    "Switch to Platform to read it and reply. Switch back to Customer to see the reply.",
    "切换到「平台」阅读并回复，再切回「用户」查看回复。",
  ],
  step3: [
    "The Professional view switches between Jordan and Sam. They have no conversations yet.",
    "「师傅」视角可以切换 Jordan 和 Sam。他们目前还没有对话。",
  ],
  guideNote: [
    "All views share one local server. Messages survive refresh and restart. No real accounts or external messages.",
    "三个视角共用本地数据，刷新或重启后消息仍然保留。不会向外部发送消息，也不需要真实账号。",
  ],
  conversations: ["Conversations", "对话"],
  people: ["People in this demo", "模拟器中的人物"],
  write: ["Write a message", "输入消息"],
  textOnly: [
    "Text messages · Enter to send · Shift + Enter for a new line",
    "文字消息 · Enter 发送 · Shift + Enter 换行",
  ],
  send: ["Send message", "发送消息"],
  describeProblem: ["Describe a home problem", "描述家里的问题"],
  reportTitle: ["Home problem report", "家居问题描述"],
  editSummary: ["Edit latest summary", "编辑最新摘要"],
  saveSummary: ["Save summary", "保存摘要"],
  summaryLabel: ["Report summary", "问题摘要"],
  summaryHint: ["Saving adds a new version to the chat. Your original message, answers, and attachments are preserved.", "保存会在聊天中添加新版本。原始消息、答案和附件会保留。"],
  simulation: ["Simulation controls", "模拟工具"],
  nextSend: ["Next send from this identity", "当前身份的下一次发送"],
  normal: ["Normal connection", "正常连接"],
  before: ["Fail before saving", "保存前连接失败"],
  after: ["Save, then lose confirmation", "保存成功，但确认响应丢失"],
  apply: ["Apply once", "应用一次"],
  faultNote: [
    "A connection can fail before a message arrives, or after it is saved but before the sender gets confirmation. This affects only the next send from the current identity.",
    "连接可能在消息到达前失败，也可能在保存成功后、发送者收到确认前中断。这里只影响当前身份的下一次发送。",
  ],
  reset: ["Reset demo", "重置模拟器"],
  resetTitle: ["Start a fresh demo?", "重新开始？"],
  resetDescription: [
    "This deletes all chat messages and restores the single empty conversation with Nearby Support.",
    "这会删除所有聊天消息，恢复为一个与 Nearby 客服的空对话。",
  ],
  cancel: ["Cancel", "取消"],
  support: ["Nearby Support", "Nearby 客服"],
  connected: ["Connected", "已连接"],
  offline: ["Cannot reach server", "连接服务器失败"],
  emptyTitle: ["Start the conversation", "开始对话"],
  emptyBody: [
    "Send your first message below. Switch perspectives to read and reply as the other person.",
    "在下方发送第一条消息，再切换视角，作为对方阅读和回复。",
  ],
  noConversation: ["No conversations yet", "暂无对话"],
  noConversationBody: [
    "This professional has not started a conversation with Alex.",
    "这位师傅尚未与 Alex 建立对话。",
  ],
  customerDescription: [
    "Needs help with a leaking kitchen sink",
    "需要维修漏水的厨房水槽",
  ],
  supportDescription: ["Platform customer service", "平台客服"],
  pro1Description: ["Plumber · available today", "水管工 · 今天有空"],
  pro2Description: ["Plumber · available tomorrow", "水管工 · 明天有空"],
  customerThread: ["Your conversation with the platform", "你与平台客服的对话"],
  supportThread: [
    "Help Alex with their service request",
    "协助 Alex 处理维修需求",
  ],
  emptyList: ["No active conversations", "还没有进行中的对话"],
  open: ["Open conversation", "打开对话"],
  sending: ["Sending…", "发送中…"],
  applied: ["Applied to the next send.", "已应用到下一次发送。"],
  sendFailure: [
    "Message not confirmed. Your text is still below.",
    "未确认发送成功，输入内容已保留。",
  ],
};
let language = localStorage.getItem("nearby-chat-language") || "en";
let actor = "customer",
  professional = "pro-1",
  state = null,
  conversationId = null,
  revision = 0,
  busy = false,
  polling = false,
  lastMessages = "";
const reportCache = new Map();
let editingReport = null, savingSummary = false;
const t = (key) => dictionary[key]?.[language === "zh-CN" ? 1 : 0] || key;
const name = (p) => (p?.id === "support" ? t("support") : p?.name || "");
const description = (p) =>
  t(
    p.id === "customer"
      ? "customerDescription"
      : p.id === "support"
        ? "supportDescription"
        : p.id === "pro-1"
          ? "pro1Description"
          : "pro2Description",
  );
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const initials = (p) => (p.id === "support" ? "N" : p.name[0]);
async function api(path, body, identity = actor) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Actor-Id": identity },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function localize() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-t]").forEach((el) => {
    el.textContent = t(el.dataset.t);
  });
  $("language").textContent = language === "en" ? "中文" : "EN";
  $("message-input").placeholder =
    language === "en" ? "Write a message…" : "输入消息…";
  if (state) renderState();
  reportFlow.localize();
  lastMessages = "";
  refresh();
}
function renderState() {
  const me = state.person;
  $("identity-avatar").textContent = initials(me);
  $("identity-name").textContent = name(me);
  $("identity-description").textContent = description(me);
  $("professional-select").hidden = me.role !== "professional";
  document
    .querySelectorAll("[data-role]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.role === me.role)),
    );
  $("conversation-count").textContent = state.conversations.length;
  $("conversation-list").innerHTML = state.conversations.length
    ? state.conversations
        .map((c) => {
          const other = state.people.find(
            (p) => c.participantIds.includes(p.id) && p.id !== actor,
          );
          return `<button class="conversation ${c.id === conversationId ? "selected" : ""}" data-conversation="${esc(c.id)}" aria-pressed="${c.id === conversationId}"><span class="avatar">${esc(initials(other))}</span><span><strong>${esc(name(other))}</strong><small>${esc(t("open"))}</small></span></button>`;
        })
        .join("")
    : `<p class="empty">${esc(t("emptyList"))}</p>`;
  $("people-list").innerHTML = state.people
    .filter((p) => p.id !== actor)
    .map(
      (p) =>
        `<div class="person"><span class="avatar">${esc(initials(p))}</span><div><strong>${esc(name(p))}</strong><small>${esc(description(p))}</small></div></div>`,
    )
    .join("");
  const selected = state.conversations.find((c) => c.id === conversationId);
  const other =
    selected &&
    state.people.find(
      (p) => selected.participantIds.includes(p.id) && p.id !== actor,
    );
  $("chat-title").textContent = other ? name(other) : t("noConversation");
  $("chat-subtitle").textContent = selected
    ? t(actor === "support" ? "supportThread" : "customerThread")
    : t("noConversationBody");
  $("composer").hidden = !selected;
  $("describe-problem").hidden = me.role !== "customer";
  if (!selected)
    $("message-list").innerHTML =
      `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("noConversation"))}</strong>${esc(t("noConversationBody"))}</div>`;
}
function renderMessages(messages) {
  const signature = JSON.stringify(messages) + language + actor;
  if (signature === lastMessages) return;
  lastMessages = signature;
  const list = $("message-list"),
    wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.innerHTML = messages.length
    ? messages
        .map((m) => {
          const sender = state.people.find((p) => p.id === m.senderId);
          const langIndex = language === "zh-CN" ? 1 : 0;
          const artifact = m.reportRef && reportCache.get(`${m.reportRef.id}:${m.reportRef.version}`);
          const report = artifact
            ? `<section class="problem-card"><strong>${esc(t("reportTitle"))} · ${esc(artifact.report.category.label[langIndex])} · v${artifact.version}</strong><dl class="report-details">${artifact.report.fields.map((f) => `<dt>${esc(f.label[langIndex])}</dt><dd>${esc(f.value)}</dd>`).join("")}</dl>${artifact.authorId === actor ? `<button type="button" data-edit-report="${esc(artifact.id)}">${esc(t("editSummary"))}</button>` : ""}</section>`
            : "";
          return `<article class="message ${m.senderId === actor ? "mine" : ""}"><div class="bubble">${esc(artifact?.text ?? m.text)}${chatMedia.markup(artifact?.attachments ?? m.attachments)}${report}</div><div class="meta">${esc(name(sender))} · ${esc(new Date(m.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }))}</div></article>`;
        })
        .join("")
    : `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("emptyTitle"))}</strong>${esc(t("emptyBody"))}</div>`;
  if (!messages.length) list.scrollTop = 0;
  else if (wasNearBottom || messages.at(-1)?.senderId === actor)
    list.scrollTop = list.scrollHeight;
  chatMedia.hydrate(list);
}
async function refresh() {
  if (polling) return;
  polling = true;
  const version = revision,
    identity = actor;
  try {
    const next = await api("/api/state", undefined, identity);
    if (version !== revision) return;
    const changed = JSON.stringify(state) !== JSON.stringify(next);
    state = next;
    if (!state.conversations.some((c) => c.id === conversationId)) {
      conversationId = state.conversations[0]?.id || null;
      lastMessages = "";
    }
    if (changed) renderState();
    if (conversationId) {
      const selected = conversationId;
      const result = await api(
        `/api/conversations/${encodeURIComponent(selected)}/messages`,
        undefined,
        identity,
      );
      if (version !== revision || selected !== conversationId) return;
      await Promise.all(result.messages.filter(m => m.reportRef).map(async m => {
        const key = `${m.reportRef.id}:${m.reportRef.version}`;
        if (reportCache.has(key)) return;
        const { report } = await api(`/api/conversations/${encodeURIComponent(selected)}/reports/${encodeURIComponent(m.reportRef.id)}?version=${m.reportRef.version}`, undefined, identity);
        if (version === revision && selected === conversationId) reportCache.set(key, report);
      }));
      if (version !== revision || selected !== conversationId) return;
      renderMessages(result.messages);
    }
    $("connection").textContent = t("connected");
  } catch {
    if (version === revision) $("connection").textContent = t("offline");
  } finally {
    polling = false;
  }
}
function switchActor(id) {
  closeSummaryEditor();
  reportCache.clear();
  chatMedia.clear();
  reportFlow.reset();
  actor = id;
  revision++;
  state = null;
  conversationId = null;
  lastMessages = "";
  $("message-input").value = "";
  $("send-error").hidden = true;
  $("fault-status").textContent = "";
  $("message-list").replaceChildren();
  $("conversation-list").replaceChildren();
  $("composer").hidden = true;
  refresh();
}
document
  .querySelectorAll("[data-role]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        switchActor(
          b.dataset.role === "professional" ? professional : b.dataset.role,
        )),
  );
$("professional-select").onchange = (e) => {
  professional = e.target.value;
  switchActor(professional);
};
$("conversation-list").onclick = (e) => {
  const button = e.target.closest("[data-conversation]");
  if (!button) return;
  if (button.dataset.conversation === conversationId) return;
  closeSummaryEditor();
  reportCache.clear();
  chatMedia.clear();
  reportFlow.reset();
  conversationId = button.dataset.conversation;
  revision++;
  lastMessages = "";
  $("message-list").replaceChildren();
  $("message-input").value = "";
  $("send-error").hidden = true;
  renderState();
  refresh();
};
function closeSummaryEditor() {
  editingReport = null;
  $("summary-dialog").close();
  $("summary-text").value = "";
}
$("message-list").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-edit-report]");
  if (!button || savingSummary) return;
  const current = { actor, conversationId, revision };
  button.disabled = true;
  try {
    const { report } = await api(`/api/conversations/${encodeURIComponent(current.conversationId)}/reports/${encodeURIComponent(button.dataset.editReport)}`, undefined, current.actor);
    if (current.revision !== revision) return;
    editingReport = { ...current, report };
    $("summary-text").value = report.text;
    $("summary-error").hidden = true;
    $("summary-dialog").showModal();
  } catch (error) {
    if (current.revision === revision) {
      $("send-error").textContent = error.message;
      $("send-error").hidden = false;
    }
  } finally { button.disabled = false; }
});
$("summary-cancel").onclick = closeSummaryEditor;
$("summary-dialog").addEventListener("cancel", e => {
  if (savingSummary) e.preventDefault();
  else closeSummaryEditor();
});
$("summary-form").onsubmit = async e => {
  e.preventDefault();
  if (savingSummary || !editingReport) return;
  const current = editingReport;
  savingSummary = true;
  $("summary-save").disabled = true;
  $("summary-cancel").disabled = true;
  $("summary-error").hidden = true;
  try {
    await api(`/api/conversations/${encodeURIComponent(current.conversationId)}/reports/${encodeURIComponent(current.report.id)}`, {
      text: $("summary-text").value, expectedVersion: current.report.version,
    }, current.actor);
    if (current.revision === revision) closeSummaryEditor();
  } catch (error) {
    if (current.revision === revision) {
      $("summary-error").textContent = error.message;
      $("summary-error").hidden = false;
    }
  } finally {
    savingSummary = false;
    $("summary-save").disabled = false;
    $("summary-cancel").disabled = false;
    refresh();
  }
};
$("language").onclick = () => {
  language = language === "en" ? "zh-CN" : "en";
  localStorage.setItem("nearby-chat-language", language);
  localize();
};
$("composer").onsubmit = async (e) => {
  e.preventDefault();
  if (busy || !conversationId || !$("message-input").value.trim()) return;
  busy = true;
  const version = revision,
    text = $("message-input").value;
  $("send").disabled = true;
  $("describe-problem").disabled = true;
  $("send").textContent = t("sending");
  $("send-error").hidden = true;
  try {
    await api(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      { text },
    );
    if (version === revision && $("message-input").value === text)
      $("message-input").value = "";
  } catch (error) {
    if (version === revision) {
      $("send-error").textContent = t("sendFailure") + " " + error.message;
      $("send-error").hidden = false;
    }
  } finally {
    busy = false;
    $("send").disabled = false;
    $("describe-problem").disabled = false;
    $("send").textContent = t("send");
    if (version === revision) {
      $("fault-status").textContent = "";
      $("fault").value = "none";
    }
    refresh();
  }
};
$("message-input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
};
$("arm").onclick = async () => {
  try {
    await api("/api/dev/fault", { mode: $("fault").value });
    $("fault-status").textContent = t("applied");
  } catch (e) {
    $("fault-status").textContent = e.message;
  }
};
$("reset").onclick = () => $("reset-dialog").showModal();
$("cancel-reset").onclick = () => $("reset-dialog").close();
$("confirm-reset").onclick = async () => {
  try {
    await api("/api/dev/reset", {});
    $("reset-dialog").close();
    switchActor("customer");
  } catch (e) {
    $("connection").textContent = e.message;
  }
};
const chatMedia = setupChatMedia({
  context: () => ({ actor, conversationId, revision }),
  escape: esc,
  language: () => language,
});
const reportFlow = setupReport({
  api,
  refresh,
  escape: esc,
  language: () => language,
  context: () => ({ actor, conversationId, revision }),
  setBusy(value) {
    busy = value;
    $("send").disabled = value;
    $("describe-problem").disabled = value;
  },
});
window.addEventListener("pagehide", () => {
  reportCache.clear();
  closeSummaryEditor();
  chatMedia.clear();
  reportFlow.reset();
});
localize();
setInterval(refresh, 1000);
