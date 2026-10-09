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
  reply: ["Reply", "回复"],
  replyingTo: ["Replying to", "回复"],
  image: ["Photo", "图片"],
  block: ["Block", "屏蔽"],
  unblock: ["Unblock", "解除屏蔽"],
  invite: ["Invite Nearby Support", "邀请客服介入"],
  supportJoined: ["Nearby Support joined", "客服已加入"],
  noResults: ["No matching messages", "没有匹配的消息"],
  badImage: ["Choose a PNG, JPEG or WebP image.", "请选择 PNG、JPEG 或 WebP 图片。"],
  bigImage: ["Images must be 2 MiB or smaller.", "图片不能超过 2 MiB。"],
  messageBtn: ["Message", "发消息"],
  recall: ["Recall", "撤回"],
  recalled: ["Message recalled", "消息已撤回"],
  retry: ["Retry", "重试"],
  failed: ["Not sent", "未发送"],
  pending: ["Sending…", "发送中…"],
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
  lastMessages = "",
  replyTo = null,
  image = null,
  searchQuery = "",
  lastRead = "";
const draftKey = (c = conversationId) => `nearby-draft:${actor}:${c}`;
const saveDraft = () => {
  if (!conversationId) return;
  const v = $("message-input").value;
  if (v) localStorage.setItem(draftKey(), v);
  else localStorage.removeItem(draftKey());
};
const loadDraft = () => {
  $("message-input").value = conversationId
    ? localStorage.getItem(draftKey()) || ""
    : "";
};
// Outbox of unconfirmed sends, per identity, survives refresh.
const outboxKey = () => `nearby-outbox:${actor}`;
const outbox = () => JSON.parse(localStorage.getItem(outboxKey()) || "[]");
const setOutbox = (items) =>
  localStorage.setItem(outboxKey(), JSON.stringify(items));
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
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed"), {
      status: response.status,
    });
  return data;
}
function localize() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-t]").forEach((el) => {
    el.textContent = t(el.dataset.t);
  });
  $("language").textContent = language === "en" ? "中文" : "EN";
  $("search").placeholder = language === "en" ? "Search this conversation" : "搜索本对话";
  $("message-input").placeholder =
    language === "en" ? "Write a message…" : "输入消息…";
  if (state) renderState();
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
          const others = state.people.filter(
            (p) => c.participantIds.includes(p.id) && p.id !== actor,
          );
          const badge = c.unreadCount
            ? `<span class="badge" aria-label="unread">${c.unreadCount}</span>`
            : "";
          return `<button class="conversation ${c.id === conversationId ? "selected" : ""}" data-conversation="${esc(c.id)}" aria-pressed="${c.id === conversationId}"><span class="avatar">${esc(initials(others[0]))}</span><span><strong>${esc(others.map(name).join(" · "))}</strong><small>${esc(t("open"))}</small></span>${badge}</button>`;
        })
        .join("")
    : `<p class="empty">${esc(t("emptyList"))}</p>`;
  $("people-list").innerHTML = state.people
    .filter((p) => p.id !== actor)
    .map(
      (p) =>
        `<div class="person"><span class="avatar">${esc(initials(p))}</span><div><strong>${esc(name(p))}</strong><small>${esc(description(p))}</small></div>${me.role === "customer" && p.role === "professional" ? `<button class="quiet" data-start="${esc(p.id)}">${esc(t("messageBtn"))}</button>` : ""}</div>`,
    )
    .join("");
  const selected = state.conversations.find((c) => c.id === conversationId);
  const others = selected
    ? state.people.filter(
        (p) => selected.participantIds.includes(p.id) && p.id !== actor,
      )
    : [];
  $("chat-title").textContent = others.length
    ? others.map(name).join(" · ")
    : t("noConversation");
  $("chat-tools").hidden = !selected;
  const pro = others.find((p) => p.role === "professional");
  $("chat-actions").innerHTML =
    me.role === "customer" && pro
      ? `<button class="quiet" data-block="${esc(pro.id)}" data-value="${!state.blocked.includes(pro.id)}">${esc(t(state.blocked.includes(pro.id) ? "unblock" : "block"))}</button>` +
        (selected.participantIds.includes("support")
          ? ` <span class="muted">${esc(t("supportJoined"))}</span>`
          : ` <button class="quiet" data-invite="${esc(selected.id)}">${esc(t("invite"))}</button>`)
      : "";
  $("chat-subtitle").textContent = selected
    ? t(actor === "support" ? "supportThread" : "customerThread")
    : t("noConversationBody");
  $("composer").hidden = !selected;
  if (!selected)
    $("message-list").innerHTML =
      `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("noConversation"))}</strong>${esc(t("noConversationBody"))}</div>`;
}
const imageHtml = (img) =>
  img
    ? `<img class="thumb" src="${esc(img.dataUrl)}" alt="${esc(img.name)}" data-large />`
    : "";
const quote = (q) =>
  q
    ? `<blockquote class="quote">${q.recalled ? `<em>${esc(t("recalled"))}</em>` : esc(q.text || (q.image ? t("image") : ""))}</blockquote>`
    : "";
function renderReply() {
  $("reply-preview").hidden = !replyTo;
  $("reply-preview").innerHTML = replyTo
    ? `${esc(t("replyingTo"))}: ${esc(replyTo.text || t("image"))} <button type="button" class="link" id="cancel-reply">${esc(t("cancel"))}</button>`
    : "";
  $("image-preview").hidden = !image;
  $("image-preview").innerHTML = image
    ? `${esc(image.name)} <button type="button" class="link" id="cancel-image">${esc(t("cancel"))}</button>`
    : "";
}
function renderResults(messages) {
  const signature = "search" + JSON.stringify(messages) + language;
  if (signature === lastMessages) return;
  lastMessages = signature;
  $("message-list").innerHTML = messages.length
    ? messages
        .map(
          (m) =>
            `<button class="result" data-jump="${esc(m.id)}">${esc(m.text)}<small>${esc(name(state.people.find((p) => p.id === m.senderId)))}</small></button>`,
        )
        .join("")
    : `<p class="empty">${esc(t("noResults"))}</p>`;
}
// T4: mark as read only what is on screen (scrolled to the bottom).
function markRead(messages) {
  const list = $("message-list");
  const last = messages.at(-1);
  if (!last || document.hidden) return;
  if (list.scrollHeight - list.scrollTop - list.clientHeight > 80) return;
  const key = actor + conversationId + last.id;
  const c = state.conversations.find((x) => x.id === conversationId);
  if (key === lastRead && !c?.unreadCount) return;
  lastRead = key;
  api(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
    throughMessageId: last.id,
  }).catch(() => {});
}
function renderMessages(messages) {
  const confirmed = new Set(messages.map((m) => m.clientMessageId));
  const pending = outbox().filter(
    (o) => o.conversationId === conversationId && !confirmed.has(o.clientMessageId),
  );
  if (pending.length !== outbox().filter((o) => o.conversationId === conversationId).length)
    setOutbox(outbox().filter((o) => !confirmed.has(o.clientMessageId)));
  const signature =
    JSON.stringify(messages) + JSON.stringify(pending) + language + actor;
  if (signature === lastMessages) return;
  lastMessages = signature;
  const list = $("message-list"),
    wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.innerHTML = messages.length || pending.length
    ? messages
        .map((m) => {
          const sender = state.people.find((p) => p.id === m.senderId);
          const mine = m.senderId === actor;
          const body = m.recalled
            ? `<em>${esc(t("recalled"))}</em>`
            : quote(m.replyTo) + imageHtml(m.image) + esc(m.text);
          const action = m.recalled
            ? ""
            : ` · <button class="link" data-reply="${esc(m.id)}">${esc(t("reply"))}</button>` +
              (mine
                ? ` · <button class="link" data-recall="${esc(m.id)}">${esc(t("recall"))}</button>`
                : "");
          return `<article class="message ${mine ? "mine" : ""}" data-id="${esc(m.id)}"><div class="bubble">${body}</div><div class="meta">${esc(name(sender))} · ${esc(new Date(m.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }))}${action}</div></article>`;
        })
        .join("") +
      pending
        .map(
          (o) =>
            `<article class="message mine"><div class="bubble">${imageHtml(o.image)}${esc(o.text)}</div><div class="meta error">${esc(t(o.status))}${o.status === "failed" ? ` · <button class="link" data-retry="${esc(o.clientMessageId)}">${esc(t("retry"))}</button>` : ""}</div></article>`,
        )
        .join("")
    : `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("emptyTitle"))}</strong>${esc(t("emptyBody"))}</div>`;
  if (!messages.length) list.scrollTop = 0;
  else if (wasNearBottom || messages.at(-1)?.senderId === actor)
    list.scrollTop = list.scrollHeight;
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
      const last = localStorage.getItem(`nearby-last:${actor}`);
      conversationId =
        (state.conversations.some((c) => c.id === last) && last) ||
        state.conversations[0]?.id ||
        null;
      lastMessages = "";
      loadDraft();
    }
    if (changed) renderState();
    if (conversationId) {
      const selected = conversationId;
      const q = searchQuery;
      const result = await api(
        `/api/conversations/${encodeURIComponent(selected)}/messages` +
          (q ? `?q=${encodeURIComponent(q)}` : ""),
        undefined,
        identity,
      );
      if (version !== revision || selected !== conversationId || q !== searchQuery) return;
      if (q) renderResults(result.messages);
      else {
        renderMessages(result.messages);
        markRead(result.messages);
      }
    }
    $("connection").textContent = t("connected");
  } catch {
    if (version === revision) $("connection").textContent = t("offline");
  } finally {
    polling = false;
  }
}
function switchActor(id) {
  clearComposeExtras();
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
  selectConversation(button.dataset.conversation);
};
function clearComposeExtras() {
  replyTo = null;
  image = null;
  searchQuery = "";
  $("search").value = "";
  $("image-input").value = "";
  renderReply();
}
function selectConversation(id) {
  clearComposeExtras();
  conversationId = id;
  localStorage.setItem(`nearby-last:${actor}`, id);
  revision++;
  lastMessages = "";
  loadDraft();
  $("send-error").hidden = true;
  renderState();
  refresh();
}
$("people-list").onclick = async (e) => {
  const button = e.target.closest("[data-start]");
  if (!button) return;
  try {
    const { conversation } = await api("/api/conversations", {
      recipientId: button.dataset.start,
    });
    state = await api("/api/state");
    selectConversation(conversation.id);
  } catch (error) {
    $("connection").textContent = error.message;
  }
};
$("message-list").onclick = async (e) => {
  const recall = e.target.closest("[data-recall]");
  const retry = e.target.closest("[data-retry]");
  const large = e.target.closest("[data-large]");
  if (large) {
    $("image-large").src = large.src;
    $("image-dialog").showModal();
    return;
  }
  const reply = e.target.closest("[data-reply]");
  if (reply) {
    const article = reply.closest("article");
    replyTo = {
      id: reply.dataset.reply,
      text: article.querySelector(".bubble").innerText,
    };
    renderReply();
    $("message-input").focus();
    return;
  }
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    searchQuery = "";
    $("search").value = "";
    lastMessages = "";
    revision++;
    await refresh();
    const target = $("message-list").querySelector(
      `[data-id="${CSS.escape(jump.dataset.jump)}"]`,
    );
    target?.scrollIntoView({ block: "center" });
    target?.classList.add("highlight");
    setTimeout(() => target?.classList.remove("highlight"), 2000);
    return;
  }
  try {
    if (recall)
      await api(`/api/messages/${encodeURIComponent(recall.dataset.recall)}/recall`, {});
    if (retry) {
      const item = outbox().find((o) => o.clientMessageId === retry.dataset.retry);
      if (item) {
        await deliver(item);
        if (localStorage.getItem(draftKey(item.conversationId)) === item.text) {
          localStorage.removeItem(draftKey(item.conversationId));
          if (item.conversationId === conversationId) $("message-input").value = "";
        }
      }
    }
  } catch (error) {
    $("send-error").textContent = error.message;
    $("send-error").hidden = false;
  }
  refresh();
};
$("reply-preview").onclick = (e) => {
  if (e.target.id === "cancel-reply") {
    replyTo = null;
    renderReply();
  }
};
$("image-preview").onclick = (e) => {
  if (e.target.id === "cancel-image") {
    image = null;
    $("image-input").value = "";
    renderReply();
  }
};
$("image-input").onchange = () => {
  const file = $("image-input").files[0];
  $("send-error").hidden = true;
  if (!file) return;
  const fail = (key) => {
    $("send-error").textContent = t(key);
    $("send-error").hidden = false;
    $("image-input").value = "";
    image = null;
    renderReply();
  };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return fail("badImage");
  if (file.size > 2 * 1024 * 1024) return fail("bigImage");
  const reader = new FileReader();
  reader.onload = () => {
    image = { name: file.name, dataUrl: reader.result };
    renderReply();
  };
  reader.readAsDataURL(file);
};
let searchTimer;
$("search").oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = $("search").value.trim();
    lastMessages = "";
    revision++;
    refresh();
  }, 250);
};
$("chat-actions").onclick = async (e) => {
  const block = e.target.closest("[data-block]");
  const invite = e.target.closest("[data-invite]");
  try {
    if (block)
      await api(`/api/people/${encodeURIComponent(block.dataset.block)}/block`, {
        blocked: block.dataset.value === "true",
      });
    if (invite)
      await api(
        `/api/conversations/${encodeURIComponent(invite.dataset.invite)}/escalate`,
        {},
      );
  } catch (error) {
    $("connection").textContent = error.message;
  }
  refresh();
};
$("language").onclick = () => {
  language = language === "en" ? "zh-CN" : "en";
  localStorage.setItem("nearby-chat-language", language);
  localize();
};
$("composer").onsubmit = async (e) => {
  e.preventDefault();
  if (busy || !conversationId || (!$("message-input").value.trim() && !image))
    return;
  busy = true;
  const version = revision,
    text = $("message-input").value;
  $("send").disabled = true;
  $("send").textContent = t("sending");
  $("send-error").hidden = true;
  const item = {
    clientMessageId: crypto.randomUUID(),
    conversationId,
    text,
    status: "pending",
    ...(image ? { image } : {}),
    ...(replyTo ? { replyToId: replyTo.id } : {}),
  };
  setOutbox([...outbox(), item]);
  try {
    await deliver(item);
    if (localStorage.getItem(draftKey(item.conversationId)) === text)
      localStorage.removeItem(draftKey(item.conversationId));
    if (version === revision && $("message-input").value === text)
      $("message-input").value = "";
    if (version === revision) {
      replyTo = null;
      image = null;
      $("image-input").value = "";
      renderReply();
    }
  } catch (error) {
    if (version === revision) {
      $("send-error").textContent =
        error.status >= 400 && error.status < 500
          ? error.message
          : t("sendFailure") + " " + error.message;
      $("send-error").hidden = false;
    }
  } finally {
    busy = false;
    $("send").disabled = false;
    $("send").textContent = t("send");
    if (version === revision) {
      $("fault-status").textContent = "";
      $("fault").value = "none";
    }
    refresh();
  }
};
async function deliver(item) {
  const sender = actor;
  try {
    await api(
      `/api/conversations/${encodeURIComponent(item.conversationId)}/messages`,
      {
        text: item.text,
        clientMessageId: item.clientMessageId,
        image: item.image,
        replyToId: item.replyToId,
      },
      sender,
    );
    if (actor === sender)
      setOutbox(outbox().filter((o) => o.clientMessageId !== item.clientMessageId));
  } catch (error) {
    if (actor === sender && error.status >= 400 && error.status < 500)
      setOutbox(outbox().filter((o) => o.clientMessageId !== item.clientMessageId));
    else if (actor === sender)
      setOutbox(
        outbox().map((o) =>
          o.clientMessageId === item.clientMessageId ? { ...o, status: "failed" } : o,
        ),
      );
    throw error;
  }
}
$("message-input").oninput = saveDraft;
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
localize();
setInterval(refresh, 1000);
