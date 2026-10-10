export function setupChatMedia({ context, escape: esc, language }) {
  const cache = new Map();
  const label = (en, zh) => (language() === "zh-CN" ? zh : en);
  function clear() {
    for (const entry of cache.values())
      if (entry.url) URL.revokeObjectURL(entry.url);
    cache.clear();
  }
  function markup(attachments = []) {
    if (!attachments.length) return "";
    return `<div class="chat-attachments">${attachments.map((file) => `<figure><div class="media-content" data-attachment-id="${esc(file.id)}" data-name="${esc(file.name)}" data-type="${esc(file.type)}" role="status">${esc(label("Loading attachment…", "正在加载附件…"))}</div><figcaption>${esc(file.name)}</figcaption></figure>`).join("")}</div>`;
  }
  async function load(id, current) {
    if (cache.has(id)) return cache.get(id).promise;
    const entry = {};
    entry.promise = (async () => {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(current.conversationId)}/attachments/${encodeURIComponent(id)}`,
        { headers: { "X-Actor-Id": current.actor } },
      );
      if (!response.ok)
        throw new Error(label("Could not load attachment.", "无法加载附件。"));
      const blob = await response.blob();
      const now = context();
      if (
        now.revision !== current.revision ||
        now.actor !== current.actor ||
        now.conversationId !== current.conversationId
      )
        return null;
      entry.url = URL.createObjectURL(blob);
      return entry.url;
    })();
    cache.set(id, entry);
    try {
      return await entry.promise;
    } catch (error) {
      if (cache.get(id) === entry) cache.delete(id);
      throw error;
    }
  }
  function hydrate(root) {
    const current = context();
    root.querySelectorAll("[data-attachment-id]").forEach(async (container) => {
      try {
        const url = await load(container.dataset.attachmentId, current);
        if (
          !url ||
          !container.isConnected ||
          context().revision !== current.revision
        )
          return;
        const video = container.dataset.type.startsWith("video/");
        const media = document.createElement(video ? "video" : "img");
        if (video) {
          media.controls = true;
          media.preload = "metadata";
          media.setAttribute("aria-label", container.dataset.name);
        } else
          media.alt =
            label("Attached photo: ", "附加照片：") + container.dataset.name;
        media.src = url;
        const download = document.createElement("a");
        download.href = url;
        download.download = container.dataset.name;
        download.textContent = label("Download", "下载");
        container.replaceChildren(media, download);
        container.removeAttribute("role");
      } catch (error) {
        if (!container.isConnected || context().revision !== current.revision)
          return;
        const retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = label("Retry attachment", "重试加载附件");
        retry.onclick = () => {
          container.textContent = label("Loading attachment…", "正在加载附件…");
          hydrate(root);
        };
        container.replaceChildren(
          document.createTextNode(error.message + " "),
          retry,
        );
      }
    });
  }
  return { markup, hydrate, clear };
}
