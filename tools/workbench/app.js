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
    "As Customer, describe the leak to Nearby Support below — type, hold 🎤 to talk, or add a photo or video.",
    "在「用户」视角，向下方的 Nearby 客服描述漏水情况：输入文字、按住 🎤 说话，或添加照片、视频。",
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
  sendFailure: [
    "Message not confirmed. Your text is still below.",
    "未确认发送成功，输入内容已保留。",
  ],
  voice: ["Voice", "语音"],
  photo: ["Photo", "照片"],
  video: ["Video", "视频"],
  takePhoto: ["Take photo", "拍照"],
  uploadPhoto: ["Upload photos", "上传照片"],
  recordVideo: ["Record video", "录制视频"],
  uploadVideo: ["Upload video", "上传视频"],
  recDone: ["Done", "完成"],
  close: ["Close", "关闭"],
  hintCustomer: [
    "Hold 🎤 to talk, or tap to record · Show the problem with a photo or video · Enter to send",
    "按住 🎤 说话，或点击录音 · 用照片或视频展示问题 · Enter 发送",
  ],
  hintSupport: [
    "Hold 🎤 to talk, or tap to record · Enter to send",
    "按住 🎤 说话，或点击录音 · Enter 发送",
  ],
  recHold: ["Release to send · move away to cancel", "松开发送 · 移开取消"],
  recCancelArmed: ["Release to cancel", "松开取消"],
  recTap: [
    "Recording… tap Done to review before sending",
    "录音中… 点击「完成」后可试听再发送",
  ],
  recStarting: ["Starting microphone…", "正在打开麦克风…"],
  voiceMessage: ["Voice message", "语音消息"],
  uploading: ["Uploading…", "上传中…"],
  ready: ["Ready to send", "可以发送"],
  sendingVoice: ["Sending voice message…", "正在发送语音…"],
  uploadFailed: ["Upload failed", "上传失败"],
  retry: ["Retry", "重试"],
  remove: ["Remove", "移除"],
  openPhoto: ["Open photo", "查看大图"],
  photoAlt: ["Photo from {name}", "{name} 发送的照片"],
  mediaUnavailable: ["Couldn’t load this file.", "文件加载失败。"],
  tooLarge: [
    "{name} is larger than {limit} MB.",
    "{name} 超过 {limit} MB 上限。",
  ],
  unsupported: [
    "{name} isn’t a supported photo, video or audio file.",
    "{name} 不是支持的照片、视频或音频格式。",
  ],
  notAllowed: [
    "Only voice messages can be sent from this account.",
    "当前账号只能发送语音消息。",
  ],
  tooMany: [
    "You can attach up to 4 files per message.",
    "每条消息最多添加 4 个文件。",
  ],
  waitUploads: ["Wait for uploads to finish.", "请等待上传完成。"],
  micUnavailable: [
    "The microphone isn’t available here. Choose or record an audio file instead.",
    "当前无法使用麦克风，请选择或录制音频文件。",
  ],
  cameraUnavailable: [
    "The camera isn’t available. Choose a file instead.",
    "当前无法使用摄像头，请选择文件。",
  ],
  cameraPhotoTitle: ["Take a photo", "拍照"],
  cameraVideoTitle: ["Record a video", "录制视频"],
  cameraStarting: ["Starting camera…", "正在打开摄像头…"],
  shoot: ["Take photo", "拍照"],
  startRecording: ["Start recording", "开始录制"],
  stopRecording: ["Stop and attach", "停止并添加"],
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
  renderedKey = "",
  stick = true,
  tray = [],
  trayKey = 0,
  recorder = null,
  pressing = false,
  pressAt = 0,
  camera = null;
const mediaCache = new Map();
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
const tf = (key, values) =>
  t(key).replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Media rules mirror src/chat.ts; the server enforces them too.
const MiB = 1024 * 1024;
const limits = { image: 20 * MiB, audio: 30 * MiB, video: 100 * MiB };
const mimeTypes = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ],
  audio: [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/aac",
    "audio/x-m4a",
    "audio/wav",
  ],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};
const roleKinds = { customer: ["image", "audio", "video"], support: ["audio"] };
const extensionTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  ogg: "audio/ogg",
  wav: "audio/wav",
};
const maxAttachments = 4;
const holdThreshold = 300;
const maxRecordingMs = 120000;
const canKind = (kind) => (roleKinds[state?.person.role] || []).includes(kind);
const baseMime = (file) =>
  (
    file.type ||
    extensionTypes[file.name?.split(".").pop()?.toLowerCase()] ||
    ""
  )
    .split(";")[0]
    .toLowerCase();
const kindOf = (mime) =>
  Object.keys(mimeTypes).find((k) => mimeTypes[k].includes(mime));
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
  renderTray();
  showRecordingBar();
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
  const kinds = roleKinds[me.role] || [];
  $("media-tools").hidden = !kinds.length;
  $("media-tools")
    .querySelectorAll("[data-kind]")
    .forEach((el) => (el.hidden = !kinds.includes(el.dataset.kind)));
  const hint =
    me.role === "customer"
      ? "hintCustomer"
      : me.role === "support"
        ? "hintSupport"
        : "textOnly";
  $("compose-hint").dataset.t = hint;
  $("compose-hint").textContent = t(hint);
  if (!selected)
    $("message-list").innerHTML =
      `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("noConversation"))}</strong>${esc(t("noConversationBody"))}</div>`;
}
function attachmentHtml(a, sender) {
  const id = esc(a.id);
  if (a.kind === "image")
    return `<button type="button" class="media-thumb" data-lightbox="${id}" aria-label="${esc(t("openPhoto"))}"><img data-attachment="${id}" alt="${esc(tf("photoAlt", { name: name(sender) }))}" /></button>`;
  if (a.kind === "video")
    return `<video class="media-video" data-attachment="${id}" controls playsinline preload="metadata"></video>`;
  return `<div class="voice"><span class="voice-label"><span aria-hidden="true">🎤</span> ${esc(t("voiceMessage"))}${a.durationMs ? " · " + esc(clock(a.durationMs)) : ""}</span><audio data-attachment="${id}" controls preload="metadata"></audio></div>`;
}
function messageHtml(m) {
  const sender = state.people.find((p) => p.id === m.senderId);
  const media = m.attachments?.length
    ? `<div class="media">${m.attachments.map((a) => attachmentHtml(a, sender)).join("")}</div>${m.text ? `<p class="caption">${esc(m.text)}</p>` : ""}`
    : esc(m.text);
  return `<article class="message ${m.senderId === actor ? "mine" : ""} ${m.attachments?.length ? "has-media" : ""}" data-id="${esc(m.id)}"><div class="bubble">${media}</div><div class="meta">${esc(name(sender))} · ${esc(new Date(m.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }))}</div></article>`;
}
function mediaUrl(id) {
  if (!mediaCache.has(id)) {
    const request = fetch(`/api/attachments/${encodeURIComponent(id)}`, {
      headers: { "X-Actor-Id": actor },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Attachment unavailable");
        return r.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    request.catch(() => mediaCache.delete(id));
    mediaCache.set(id, request);
  }
  return mediaCache.get(id);
}
function clearMediaCache() {
  mediaCache.forEach((p) => p.then(URL.revokeObjectURL, () => {}));
  mediaCache.clear();
}
function hydrateMedia(list) {
  const version = revision;
  list
    .querySelectorAll("[data-attachment]:not([data-loading])")
    .forEach((el) => {
      el.dataset.loading = "1";
      const keep = () => stick && (list.scrollTop = list.scrollHeight);
      el.addEventListener("load", keep, { once: true });
      el.addEventListener("loadedmetadata", keep, { once: true });
      mediaUrl(el.dataset.attachment).then(
        (url) => version === revision && (el.src = url),
        () => {
          if (version !== revision) return;
          const note = document.createElement("span");
          note.className = "media-error";
          note.textContent = t("mediaUnavailable");
          (el.closest(".media-thumb") || el).replaceWith(note);
        },
      );
    });
}
// Appends new messages instead of rebuilding the list, so a voice note or
// video that is playing keeps playing when the 1 s poll brings a new message.
function renderMessages(messages) {
  const signature = JSON.stringify(messages) + language + actor;
  if (signature === lastMessages) return;
  lastMessages = signature;
  const list = $("message-list"),
    wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  const key = `${actor}|${conversationId}|${language}`;
  const ids = new Set(messages.map((m) => m.id));
  const shown = [...list.querySelectorAll("article[data-id]")];
  if (
    key !== renderedKey ||
    !messages.length ||
    !shown.length ||
    shown.some((el) => !ids.has(el.dataset.id))
  ) {
    list.innerHTML = messages.length
      ? messages.map(messageHtml).join("")
      : `<div class="empty"><div class="empty-symbol" aria-hidden="true">…</div><strong>${esc(t("emptyTitle"))}</strong>${esc(t("emptyBody"))}</div>`;
    renderedKey = key;
  } else {
    const seen = new Set(shown.map((el) => el.dataset.id));
    const html = messages
      .filter((m) => !seen.has(m.id))
      .map(messageHtml)
      .join("");
    if (html) list.insertAdjacentHTML("beforeend", html);
  }
  hydrateMedia(list);
  // A message saved without confirmation (e.g. after-save fault) has already
  // used its attachments; drop them from the tray so they aren't sent twice.
  const sent = new Set(
    messages.flatMap((m) => (m.attachments || []).map((a) => a.id)),
  );
  const leftover = tray.filter(
    (i) => i.attachment && sent.has(i.attachment.id),
  );
  if (leftover.length) removeItems(leftover);
  if (!messages.length) list.scrollTop = 0;
  else if (wasNearBottom || messages.at(-1)?.senderId === actor) {
    stick = true;
    list.scrollTop = list.scrollHeight;
  }
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
      renderMessages(result.messages);
    }
    $("connection").textContent = t("connected");
  } catch {
    if (version === revision) $("connection").textContent = t("offline");
  } finally {
    polling = false;
  }
}
function resetComposerMedia() {
  cancelRecording();
  closeCamera();
  removeItems([...tray]);
  closeMenus();
}
function switchActor(id) {
  resetComposerMedia();
  clearMediaCache();
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
  if (button.dataset.conversation !== conversationId) resetComposerMedia();
  conversationId = button.dataset.conversation;
  revision++;
  lastMessages = "";
  $("message-input").value = "";
  $("send-error").hidden = true;
  renderState();
  refresh();
};
$("language").onclick = () => {
  language = language === "en" ? "zh-CN" : "en";
  localStorage.setItem("nearby-chat-language", language);
  localize();
};
function showError(message) {
  $("send-error").textContent = message;
  $("send-error").hidden = !message;
}
function updateSendState() {
  $("send").disabled = busy || tray.some((i) => i.status === "uploading");
}

// ---- Attachment tray ----------------------------------------------------
function trayLabel(item) {
  if (item.kind === "audio")
    return (
      t("voiceMessage") +
      (item.durationMs ? " · " + clock(item.durationMs) : "")
    );
  return item.name;
}
function trayStatus(item) {
  if (item.status === "uploading")
    return item.autoSend ? t("sendingVoice") : t("uploading");
  if (item.status === "error") return item.error;
  return item.autoSend ? t("sendingVoice") : t("ready");
}
function renderTray() {
  $("tray").hidden = !tray.length;
  $("tray").innerHTML = tray
    .map((item) => {
      const preview =
        item.kind === "image"
          ? `<img src="${item.previewUrl}" alt="" />`
          : item.kind === "video"
            ? `<video src="${item.previewUrl}" muted playsinline preload="metadata"></video>`
            : `<audio src="${item.previewUrl}" controls preload="metadata"></audio>`;
      return `<li class="tray-item ${item.kind} ${item.status}" data-key="${item.key}">${preview}<div class="tray-info"><strong>${esc(trayLabel(item))}</strong><small>${esc(trayStatus(item))}</small>${item.status === "uploading" ? `<progress max="1" value="${item.progress}"></progress>` : ""}${item.status === "error" ? `<button type="button" class="link" data-retry="${item.key}">${esc(t("retry"))}</button>` : ""}</div><button type="button" class="remove" data-remove="${item.key}" aria-label="${esc(t("remove"))} ${esc(trayLabel(item))}">✕</button></li>`;
    })
    .join("");
  updateSendState();
}
function removeItems(items) {
  items.forEach((item) => {
    item.xhr?.abort();
    URL.revokeObjectURL(item.previewUrl);
  });
  tray = tray.filter((i) => !items.includes(i));
  renderTray();
}
function upload(item) {
  item.status = "uploading";
  item.progress = 0;
  const xhr = new XMLHttpRequest();
  item.xhr = xhr;
  xhr.open(
    "POST",
    `/api/conversations/${encodeURIComponent(item.conversationId)}/attachments`,
  );
  xhr.setRequestHeader("X-Actor-Id", item.actor);
  xhr.setRequestHeader("Content-Type", item.mime);
  if (item.name)
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(item.name));
  if (item.durationMs)
    xhr.setRequestHeader("X-Duration-Ms", String(item.durationMs));
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    item.progress = e.loaded / e.total;
    const bar = $("tray").querySelector(`[data-key="${item.key}"] progress`);
    if (bar) bar.value = item.progress;
  };
  const fail = (message) => {
    if (!tray.includes(item)) return;
    item.status = "error";
    item.error = message || t("uploadFailed");
    item.autoSend = false;
    renderTray();
  };
  xhr.onload = () => {
    if (!tray.includes(item)) return;
    let data = {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch {}
    if (xhr.status !== 201) return fail(data.error);
    item.status = "ready";
    item.attachment = data.attachment;
    renderTray();
    if (item.autoSend) sendMessage("", [item]);
  };
  xhr.onerror = () => fail();
  xhr.send(item.blob);
  renderTray();
}
// Large photos are re-encoded to ≤2048 px JPEG so they upload quickly on mobile data.
async function shrinkImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(baseMime(file)))
    return file;
  if (file.size < 1.5 * MiB) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], base + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
async function addFiles(files, options = {}) {
  if (!conversationId) return;
  const version = revision;
  const errors = [];
  for (const file of files) {
    const label = file.name || t("voiceMessage");
    const kind = kindOf(baseMime(file));
    if (!kind) {
      errors.push(tf("unsupported", { name: label }));
      continue;
    }
    if (!canKind(kind)) {
      errors.push(t("notAllowed"));
      continue;
    }
    if (
      !options.autoSend &&
      tray.filter((i) => !i.autoSend).length >= maxAttachments
    ) {
      errors.push(t("tooMany"));
      break;
    }
    const blob = kind === "image" ? await shrinkImage(file) : file;
    if (version !== revision) return;
    if (blob.size > limits[kind]) {
      errors.push(tf("tooLarge", { name: label, limit: limits[kind] / MiB }));
      continue;
    }
    const item = {
      key: String(++trayKey),
      blob,
      kind,
      mime: baseMime(blob) || baseMime(file),
      name: blob.name || file.name || "",
      durationMs: options.durationMs,
      previewUrl: URL.createObjectURL(blob),
      autoSend: !!options.autoSend,
      actor,
      conversationId,
      status: "uploading",
      progress: 0,
    };
    tray.push(item);
    upload(item);
  }
  showError(errors.join(" "));
}
$("tray").onclick = (e) => {
  const remove = e.target.closest("[data-remove]");
  if (remove) removeItems(tray.filter((i) => i.key === remove.dataset.remove));
  const retry = e.target.closest("[data-retry]");
  const item = retry && tray.find((i) => i.key === retry.dataset.retry);
  if (!item) return;
  if (item.attachment) sendMessage("", [item]);
  else upload(item);
};

// ---- Sending ------------------------------------------------------------
async function sendMessage(text, items) {
  const version = revision,
    selected = conversationId;
  try {
    await api(`/api/conversations/${encodeURIComponent(selected)}/messages`, {
      text,
      attachmentIds: items.map((i) => i.attachment.id),
    });
    if (version === revision)
      removeItems(items.filter((i) => tray.includes(i)));
    return true;
  } catch (error) {
    if (version === revision) {
      items.forEach((i) => (i.autoSend = false));
      renderTray();
      showError(t("sendFailure") + " " + error.message);
    }
    return false;
  } finally {
    if (version === revision) {
      $("fault-status").textContent = "";
      $("fault").value = "none";
    }
    refresh();
  }
}
$("composer").onsubmit = async (e) => {
  e.preventDefault();
  if (busy || !conversationId) return;
  if (tray.some((i) => i.status === "uploading" && !i.autoSend))
    return showError(t("waitUploads"));
  const items = tray.filter((i) => i.status === "ready" && !i.autoSend);
  const text = $("message-input").value;
  if (!text.trim() && !items.length) return;
  busy = true;
  const version = revision;
  updateSendState();
  $("send").textContent = t("sending");
  showError("");
  const ok = await sendMessage(text, items);
  if (ok && version === revision && $("message-input").value === text)
    $("message-input").value = "";
  busy = false;
  $("send").textContent = t("send");
  updateSendState();
};

// ---- Voice: hold to talk, or tap to record and review ---------------------
const recorderType = () =>
  [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
function showRecordingBar() {
  const bar = $("recording-bar");
  bar.hidden = !recorder;
  if (!recorder) return;
  bar.dataset.mode = recorder.mode || "starting";
  $("rec-time").textContent = clock(
    recorder.started ? Date.now() - recorder.started : 0,
  );
  $("rec-hint").textContent = t(
    !recorder.mode
      ? "recStarting"
      : recorder.mode === "tap"
        ? "recTap"
        : bar.classList.contains("cancel-armed")
          ? "recCancelArmed"
          : "recHold",
  );
  $("rec-done").hidden = $("rec-cancel").hidden = recorder.mode !== "tap";
  $("voice-button").classList.toggle("recording", !!recorder.mode);
}
function micFallback() {
  recorder = null;
  showRecordingBar();
  showError(t("micUnavailable"));
  $("audio-file").click();
}
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
    return micFallback();
  const rec = { chunks: [], mode: null, version: revision };
  recorder = rec;
  showRecordingBar();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    if (recorder === rec) micFallback();
    return;
  }
  if (recorder !== rec || rec.version !== revision) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }
  const type = recorderType();
  rec.stream = stream;
  rec.mr = new MediaRecorder(stream, type ? { mimeType: type } : {});
  rec.mr.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
  rec.mr.start(250);
  rec.started = Date.now();
  // Still held: hold-to-talk (pointerup may turn a quick tap into review
  // mode). Released while the permission prompt was open, or keyboard: review.
  rec.mode = pressing ? "hold" : "tap";
  rec.timer = setInterval(() => {
    if (Date.now() - rec.started >= maxRecordingMs)
      finishRecording(rec.mode === "hold" ? "send" : "review");
    else showRecordingBar();
  }, 250);
  showRecordingBar();
}
function finishRecording(action) {
  const rec = recorder;
  recorder = null;
  $("recording-bar").classList.remove("cancel-armed");
  $("voice-button").classList.remove("recording");
  showRecordingBar();
  if (!rec) return;
  clearInterval(rec.timer);
  if (!rec.mr) return; // still waiting for permission; startRecording cleans up
  const durationMs = Date.now() - rec.started;
  rec.mr.onstop = () => {
    rec.stream.getTracks().forEach((track) => track.stop());
    if (action === "cancel" || rec.version !== revision || durationMs < 500)
      return;
    const type = (rec.mr.mimeType || rec.chunks[0]?.type || "audio/webm").split(
      ";",
    )[0];
    const blob = new Blob(rec.chunks, { type });
    addFiles([blob], { durationMs, autoSend: action === "send" });
  };
  rec.mr.stop();
}
function cancelRecording() {
  pressing = false;
  finishRecording("cancel");
}
const overVoiceButton = (e) => {
  const r = $("voice-button").getBoundingClientRect();
  return (
    e.clientX >= r.left - 12 &&
    e.clientX <= r.right + 12 &&
    e.clientY >= r.top - 12 &&
    e.clientY <= r.bottom + 12
  );
};
$("voice-button").addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  if (recorder?.mode === "tap") return finishRecording("review");
  if (recorder) return;
  showError("");
  pressing = true;
  pressAt = Date.now();
  startRecording();
});
document.addEventListener("pointermove", (e) => {
  if (!pressing || recorder?.mode !== "hold") return;
  $("recording-bar").classList.toggle("cancel-armed", !overVoiceButton(e));
  showRecordingBar();
});
document.addEventListener("pointerup", (e) => {
  if (!pressing) return;
  pressing = false;
  if (!recorder?.mode) return; // permission prompt open: becomes tap mode
  if (Date.now() - pressAt < holdThreshold) {
    recorder.mode = "tap";
    showRecordingBar();
  } else finishRecording(overVoiceButton(e) ? "send" : "cancel");
});
document.addEventListener("pointercancel", () => pressing && cancelRecording());
$("voice-button").addEventListener("contextmenu", (e) => e.preventDefault());
// Keyboard users: Enter/Space starts a recording to review, again to stop.
$("voice-button").addEventListener("click", (e) => {
  if (e.detail !== 0) return;
  if (recorder?.mode === "tap") finishRecording("review");
  else if (!recorder) startRecording();
});
$("rec-done").onclick = () => finishRecording("review");
$("rec-cancel").onclick = () => cancelRecording();

// ---- Photo and video: native camera on phones, in-page camera on desktop --
function closeMenus() {
  document.querySelectorAll(".menu").forEach((m) => (m.hidden = true));
  document
    .querySelectorAll("[data-menu]")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
}
document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-menu]");
  const menu = toggle && $(toggle.dataset.menu);
  const wasOpen = menu && !menu.hidden;
  if (!e.target.closest(".menu")) closeMenus();
  if (menu && !wasOpen) {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }
});
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenus());
document.querySelectorAll("[data-pick]").forEach(
  (b) =>
    (b.onclick = () => {
      closeMenus();
      $(b.dataset.pick).click();
    }),
);
document.querySelectorAll("[data-capture]").forEach(
  (b) =>
    (b.onclick = () => {
      closeMenus();
      openCamera(b.dataset.capture);
    }),
);
[
  "image-camera",
  "image-file",
  "video-camera",
  "video-file",
  "audio-file",
].forEach(
  (id) =>
    ($(id).onchange = (e) => {
      addFiles([...e.target.files]);
      e.target.value = "";
    }),
);
function closeCamera() {
  if (!camera) return;
  clearInterval(camera.timer);
  if (camera.mr?.state === "recording") {
    camera.mr.onstop = null;
    camera.mr.stop();
  }
  camera.stream?.getTracks().forEach((track) => track.stop());
  camera = null;
  $("camera-preview").srcObject = null;
  if ($("camera-dialog").open) $("camera-dialog").close();
}
async function openCamera(kind) {
  const useNative =
    matchMedia("(pointer: coarse)").matches ||
    !navigator.mediaDevices?.getUserMedia ||
    (kind === "video" && !window.MediaRecorder);
  if (useNative) return $(kind + "-camera").click();
  const session = { kind, version: revision };
  camera = session;
  $("camera-title").textContent = t(
    kind === "image" ? "cameraPhotoTitle" : "cameraVideoTitle",
  );
  $("camera-status").textContent = t("cameraStarting");
  $("camera-shoot").textContent = t(
    kind === "image" ? "shoot" : "startRecording",
  );
  $("camera-shoot").disabled = true;
  $("camera-dialog").showModal();
  try {
    session.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: kind === "video",
    });
  } catch {
    if (camera !== session) return;
    closeCamera();
    showError(t("cameraUnavailable"));
    $(kind + "-file").click();
    return;
  }
  if (camera !== session)
    return session.stream.getTracks().forEach((tr) => tr.stop());
  $("camera-preview").srcObject = session.stream;
  $("camera-status").textContent = "";
  $("camera-shoot").disabled = false;
}
$("camera-shoot").onclick = () => {
  const session = camera;
  if (!session?.stream) return;
  const preview = $("camera-preview");
  if (session.kind === "image") {
    const canvas = document.createElement("canvas");
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    canvas.getContext("2d").drawImage(preview, 0, 0);
    canvas.toBlob(
      (blob) => {
        closeCamera();
        if (blob && session.version === revision)
          addFiles([
            new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
          ]);
      },
      "image/jpeg",
      0.9,
    );
    return;
  }
  if (session.mr) return session.mr.stop();
  const type =
    ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((v) =>
      MediaRecorder.isTypeSupported(v),
    ) || "";
  const chunks = [];
  session.mr = new MediaRecorder(
    session.stream,
    type ? { mimeType: type } : {},
  );
  session.mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  session.mr.onstop = () => {
    const mime = (session.mr.mimeType || "video/webm").split(";")[0];
    const ext = mime === "video/mp4" ? "mp4" : "webm";
    closeCamera();
    if (session.version === revision)
      addFiles([
        new File(chunks, `video-${Date.now()}.${ext}`, { type: mime }),
      ]);
  };
  session.mr.start(500);
  const started = Date.now();
  $("camera-shoot").textContent = t("stopRecording");
  session.timer = setInterval(() => {
    $("camera-status").textContent = "● " + clock(Date.now() - started);
  }, 250);
};
$("camera-cancel").onclick = () => closeCamera();
$("camera-dialog").addEventListener("close", () => closeCamera());

// Paste or drop photos and videos straight into the composer.
$("message-input").addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length || !canKind("image")) return;
  e.preventDefault();
  addFiles(files);
});
$("composer").addEventListener("dragover", (e) => {
  if (canKind("image") && e.dataTransfer?.types.includes("Files"))
    e.preventDefault();
});
$("composer").addEventListener("drop", (e) => {
  if (!canKind("image")) return;
  e.preventDefault();
  addFiles([...e.dataTransfer.files]);
});

// ---- Message list -------------------------------------------------------
$("message-list").addEventListener("scroll", (e) => {
  const list = e.currentTarget;
  stick = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
});
$("message-list").onclick = async (e) => {
  const thumb = e.target.closest("[data-lightbox]");
  if (!thumb) return;
  try {
    $("lightbox-image").src = await mediaUrl(thumb.dataset.lightbox);
    $("lightbox-image").alt = thumb.querySelector("img")?.alt || "";
    $("lightbox").showModal();
  } catch {}
};
$("lightbox-close").onclick = () => $("lightbox").close();
$("lightbox").onclick = (e) =>
  e.target === $("lightbox") && $("lightbox").close();
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
