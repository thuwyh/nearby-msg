import {
  generateSummary,
  quickChoices,
  reportQuestions,
} from "/report-utils.js";

export function setupReport({
  api,
  context,
  refresh,
  escape: esc,
  language,
  setBusy,
}) {
  const $ = (id) => document.getElementById(id);
  const label = (pair) => pair[language() === "zh-CN" ? 1 : 0];
  let schema,
    step = 1,
    answers = {},
    categoryId = "plumbing",
    draftContext;
  let files = [],
    submitting = false,
    messageEdited = false,
    renderedDefault = "",
    failure = "";
  const dialog = $("problem-dialog");
  const words = {
    title: ["Describe a home problem", "描述家里的问题"],
    intro: [
      "Quick choices or your own words — no diagnosis needed. Only location and observations are required. ‘Not sure’ is a valid answer.",
      "可以快捷选择，也可以自己描述，无需诊断。只有位置和现象必填，可以回答“不确定”。",
    ],
    category: ["What needs attention?", "什么需要维修？"],
    next: ["Continue", "继续"],
    back: ["Back", "返回"],
    close: ["Close", "关闭"],
    send: ["Send problem report", "发送问题描述"],
    sending: ["Sending…", "发送中…"],
    stages: [
      ["Describe", "描述问题"],
      ["Details (optional)", "详情（选填）"],
      ["Review", "确认"],
    ],
    message: ["Your message (editable)", "消息（可编辑）"],
    review: [
      "Review the message and attachments before sending. Back lets you change your answers.",
      "发送前确认消息和附件，返回可修改答案。",
    ],
    regenerate: ["Regenerate from answers", "根据答案重新生成"],
    edited: [
      "Your edited message is kept. If details change, you can regenerate it from your answers.",
      "已保留你修改的消息。详情变化后，可以根据答案重新生成。",
    ],
    originals: ["View structured answers", "查看结构化答案"],
    failure: [
      "Report not confirmed. Your answers and attachments are kept. Check the chat before sending again.",
      "问题描述未确认发送。答案和附件已保留，请先查看聊天再尝试发送。",
    ],
    required: ["Required", "必填"],
    optional: ["Optional", "选填"],
    media: ["Add photos or a short video", "添加照片或短视频"],
    mediaHint: [
      "Optional · Up to 3 files · 8 MiB each, 16 MiB total · JPEG, PNG, WebP, GIF, MP4 or WebM. A view of the affected area can help; no need to investigate the cause.",
      "选填 · 最多3个文件 · 每个8 MiB，总共16 MiB · JPEG、PNG、WebP、GIF、MP4或WebM。可以拍摄受影响区域，无需查找原因。",
    ],
    remove: ["Remove", "移除"],
    skip: ["Skip optional details", "跳过可选详情"],
    invalidFile: [
      "Use JPEG, PNG, WebP, GIF, MP4 or WebM files up to 8 MiB each.",
      "请使用JPEG、PNG、WebP、GIF、MP4或WebM文件，每个最多8 MiB。",
    ],
    tooMany: [
      "Attach up to 3 files, at most 16 MiB in total.",
      "最多3个附件，总共不超过16 MiB。",
    ],
    emptyMessage: ["Enter a message before sending.", "请输入要发送的消息。"],
    longMessage: [
      "Shorten your message to 4,000 characters.",
      "请将消息缩短到4000个字符以内。",
    ],
    photo: ["Photo", "照片"],
    video: ["Video", "视频"],
  };
  const t = (key) => label(words[key]);
  const category = () => schema.categories.find((c) => c.id === categoryId);
  const questions = () => reportQuestions(schema, categoryId);
  const matches = () => {
    const now = context();
    return (
      draftContext &&
      now.actor === draftContext.actor &&
      now.conversationId === draftContext.conversationId &&
      now.revision === draftContext.revision
    );
  };
  function releaseFiles() {
    files.forEach((item) => URL.revokeObjectURL(item.url));
    files = [];
  }
  function collect() {
    dialog.querySelectorAll("[data-answer]").forEach((input) => {
      answers[input.dataset.answer] = input.value;
    });
  }
  function preserve() {
    collect();
    if ($("problem-message")) {
      answers._message = $("problem-message").value;
      messageEdited = answers._message !== renderedDefault;
    }
  }
  const summary = () =>
    generateSummary(
      schema,
      categoryId,
      answers,
      files.map((item) => item.file),
      language(),
    );
  function field(q) {
    const control = ["observation", "tried", "notes"].includes(q.id)
      ? `<textarea id="problem-${esc(q.id)}" data-answer="${esc(q.id)}" rows="2" maxlength="300" ${q.required ? "required" : ""} aria-describedby="hint-${esc(q.id)}">${esc(answers[q.id] || "")}</textarea>`
      : `<input id="problem-${esc(q.id)}" data-answer="${esc(q.id)}" value="${esc(answers[q.id] || "")}" maxlength="300" ${q.required ? "required" : ""} aria-describedby="hint-${esc(q.id)}">`;
    return `<div class="problem-field" data-field="${esc(q.id)}"><label for="problem-${esc(q.id)}">${esc(label(q.label))} <small>${esc(t(q.required ? "required" : "optional"))}</small></label><span id="hint-${esc(q.id)}" class="muted">${q.hint ? esc(label(q.hint)) : ""}</span><div class="choice-list" data-question="${esc(q.id)}"></div>${control}</div>`;
  }
  function updateChoices() {
    dialog.querySelectorAll(".choice-list").forEach((list) => {
      const q = questions().find((q) => q.id === list.dataset.question);
      const hidden = q.hiddenWhen?.values.includes(answers[q.hiddenWhen.field]);
      list.closest("[data-field]").hidden = !!hidden;
      if (hidden) {
        delete answers[q.id];
        $("problem-" + q.id).value = "";
      }
      list.innerHTML = quickChoices(q, category(), answers)
        .map(
          (choice, i) =>
            `<button type="button" class="quick-choice" data-choice="${i}" data-question="${esc(q.id)}" aria-pressed="${answers[q.id] === label(choice)}">${esc(label(choice))}</button>`,
        )
        .join("");
    });
    if ($("problem-uncertainty")) {
      $("problem-uncertainty").textContent = label(
        category().uncertaintyPrompt,
      );
      $("problem-uncertainty").hidden =
        categoryId !== "other" &&
        !questions().some((q) =>
          ["Not sure", "不确定"].includes(answers[q.id]?.trim()),
        );
    }
  }
  function mediaMarkup() {
    return `<section class="problem-media"><label class="problem-field" for="problem-files"><span>${esc(t("media"))} <small>${esc(t("optional"))}</small></span><span id="problem-media-hint" class="muted">${esc(t("mediaHint"))}</span><input id="problem-files" type="file" multiple accept="${schema.mediaLimits.types.join(",")}" aria-describedby="problem-media-hint"></label><div class="attachment-previews">${files.map((item, i) => `<figure>${item.file.type.startsWith("image/") ? `<img src="${esc(item.url)}" alt="${esc(item.file.name)}">` : `<video src="${esc(item.url)}" controls preload="metadata" aria-label="${esc(item.file.name)}"></video>`}<figcaption>${esc(item.file.name)} · ${(item.file.size / 1024 / 1024).toFixed(1)} MiB</figcaption><button type="button" data-remove="${i}" aria-label="${esc(t("remove") + " " + item.file.name)}">${esc(t("remove"))}</button></figure>`).join("")}</div></section>`;
  }
  function render() {
    $("problem-title").textContent = t("title");
    $("problem-intro").textContent = t("intro");
    $("problem-step").textContent = `${step} / 3`;
    $("problem-stage").textContent = label(words.stages[step - 1]);
    $("problem-progress").value = step;
    $("problem-close").textContent = t("close");
    $("problem-back").textContent = t("back");
    $("problem-back").hidden = step === 1;
    $("problem-next").textContent = submitting
      ? t("sending")
      : step === 3
        ? t("send")
        : t("next");
    $("problem-skip").textContent = t("skip");
    $("problem-skip").hidden = step !== 2;
    $("problem-error").textContent = failure;
    $("problem-error").hidden = !failure;
    if (step === 1) {
      const location = schema.common.find((q) => q.id === "location");
      const observation = schema.common.find((q) => q.id === "observation");
      $("problem-fields").innerHTML =
        `<label class="problem-field" for="problem-category"><span>${esc(t("category"))}</span><select id="problem-category">${schema.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === categoryId ? "selected" : ""}>${esc(label(c.label))}</option>`).join("")}</select></label>${field(location)}${category()
          .questions.filter((q) => q.step === 1)
          .map(field)
          .join(
            "",
          )}${field(observation)}<p id="problem-uncertainty" class="uncertainty-note" role="status" hidden></p>`;
    } else if (step === 2) {
      $("problem-fields").innerHTML =
        `<button type="button" id="problem-skip-details">${esc(t("skip"))}</button>${mediaMarkup()}${questions()
          .filter((q) => q.step === 2)
          .map(field)
          .join("")}`;
    } else {
      renderedDefault = summary();
      $("problem-fields").innerHTML =
        `<p>${esc(t("review"))}</p><label class="problem-field" for="problem-message"><span>${esc(t("message"))}</span><textarea id="problem-message" rows="7" maxlength="4000" required>${esc(messageEdited ? answers._message : renderedDefault)}</textarea></label><p id="problem-edited-note" class="muted" ${messageEdited ? "" : "hidden"}>${esc(t("edited"))}</p><button type="button" id="problem-regenerate">${esc(t("regenerate"))}</button>${mediaMarkup()}<details class="report-answer-review"><summary>${esc(t("originals"))}</summary><strong>${esc(label(category().label))}</strong><dl class="report-details">${questions()
          .filter((q) => answers[q.id]?.trim())
          .map(
            (q) =>
              `<dt>${esc(label(q.label))}</dt><dd>${esc(answers[q.id].trim())}</dd>`,
          )
          .join("")}</dl></details>`;
    }
    updateChoices();
    setControlsDisabled(submitting);
  }
  function setControlsDisabled(value) {
    $("problem-form").setAttribute("aria-busy", String(value));
    $("problem-form")
      .querySelectorAll("input, textarea, select, button")
      .forEach((control) => {
        control.disabled = value;
      });
  }
  function changeAnswer(id) {
    const previous = answers[id];
    collect();
    const q = questions().find((q) => q.id === id);
    if (previous !== answers[id]) {
      for (const dependent of q.clears || []) {
        delete answers[dependent];
        if ($(`problem-${dependent}`)) $(`problem-${dependent}`).value = "";
      }
    }
    updateChoices();
  }
  function advance() {
    preserve();
    step++;
    render();
    dialog.scrollTop = 0;
    $("problem-fields").querySelector("input, textarea, select")?.focus();
  }
  $("describe-problem").onclick = async () => {
    const current = context();
    if (!current.conversationId || current.actor !== "customer") return;
    $("describe-problem").disabled = true;
    try {
      schema ??= await api("/api/problem-schema");
      if (context().revision !== current.revision) return;
      if (!matches()) {
        releaseFiles();
        answers = {};
        categoryId = "plumbing";
        step = 1;
        messageEdited = false;
        failure = "";
      }
      draftContext = current;
      render();
      dialog.showModal();
    } catch (error) {
      $("send-error").textContent = error.message;
      $("send-error").hidden = false;
    } finally {
      $("describe-problem").disabled = false;
    }
  };
  $("problem-fields").addEventListener("input", (e) => {
    e.target.setCustomValidity?.("");
    if (e.target.dataset.answer) changeAnswer(e.target.dataset.answer);
    if (e.target.id === "problem-message") {
      messageEdited = e.target.value !== renderedDefault;
      $("problem-edited-note").hidden = !messageEdited;
    }
  });
  $("problem-fields").addEventListener("change", (e) => {
    if (e.target.id === "problem-category") {
      preserve();
      const previousCategory = category();
      categoryId = e.target.value;
      const common = new Set(schema.common.map((q) => q.id));
      answers = Object.fromEntries(
        Object.entries(answers).filter(([id]) => common.has(id)),
      );
      // Clear category-specific quick answers, but preserve Alex's own wording.
      for (const id of ["observation", "frequency"]) {
        if (
          previousCategory.commonChoices[id]?.some((choice) =>
            choice.includes(answers[id]),
          )
        )
          delete answers[id];
      }
      messageEdited = false;
      render();
      $("problem-category").focus();
    }
    if (e.target.id === "problem-files") {
      preserve();
      const selected = Array.from(e.target.files);
      const limits = schema.mediaLimits;
      if (
        selected.some(
          (file) =>
            !limits.types.includes(file.type) ||
            !file.size ||
            file.size > limits.maxFileBytes ||
            file.name.length > 120,
        )
      )
        failure = t("invalidFile");
      else if (
        files.length + selected.length > limits.maxFiles ||
        [...files.map((item) => item.file), ...selected].reduce(
          (sum, file) => sum + file.size,
          0,
        ) > limits.maxTotalBytes
      )
        failure = t("tooMany");
      else {
        files.push(
          ...selected.map((file) => ({ file, url: URL.createObjectURL(file) })),
        );
        failure = "";
      }
      render();
    }
  });
  $("problem-fields").addEventListener("click", (e) => {
    const choice = e.target.closest("[data-choice]");
    if (choice) {
      const q = questions().find((q) => q.id === choice.dataset.question);
      $("problem-" + q.id).value = label(
        quickChoices(q, category(), answers)[Number(choice.dataset.choice)],
      );
      changeAnswer(q.id);
      $("problem-" + q.id).focus();
    }
    const remove = e.target.closest("[data-remove]");
    if (remove) {
      preserve();
      const [item] = files.splice(Number(remove.dataset.remove), 1);
      URL.revokeObjectURL(item.url);
      render();
    }
    if (e.target.id === "problem-regenerate") {
      messageEdited = false;
      delete answers._message;
      render();
      $("problem-message").focus();
    }
    if (e.target.id === "problem-skip-details") advance();
  });
  $("problem-close").onclick = () => {
    preserve();
    dialog.close();
  };
  dialog.addEventListener("cancel", (e) => {
    if (submitting) e.preventDefault();
    else preserve();
  });
  $("problem-back").onclick = () => {
    preserve();
    step--;
    render();
    dialog.scrollTop = 0;
  };
  $("problem-skip").onclick = advance;
  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          type: file.type,
          data: reader.result.slice(reader.result.indexOf(",") + 1),
        });
      reader.onerror = () => reject(new Error("Could not read " + file.name));
      reader.readAsDataURL(file);
    });
  $("problem-form").onsubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (step < 3) {
      advance();
      return;
    }
    preserve();
    if (!matches()) {
      dialog.close();
      return;
    }
    const text = answers._message.trim();
    if (!text || text.length > 4000) {
      $("problem-message").setCustomValidity(
        t(!text ? "emptyMessage" : "longMessage"),
      );
      $("problem-message").reportValidity();
      return;
    }
    const report = {
      version: schema.version,
      categoryId,
      answers: Object.fromEntries(
        questions()
          .filter((q) => answers[q.id]?.trim())
          .map((q) => [q.id, answers[q.id].trim()]),
      ),
    };
    submitting = true;
    setBusy(true);
    failure = "";
    setControlsDisabled(true);
    $("problem-next").textContent = t("sending");
    $("problem-error").hidden = true;
    try {
      const attachments = await Promise.all(
        files.map((item) => readFile(item.file)),
      );
      await api(
        `/api/conversations/${encodeURIComponent(draftContext.conversationId)}/messages`,
        { text, report, attachments },
        draftContext.actor,
      );
      if (matches()) {
        dialog.close();
        releaseFiles();
        answers = {};
        step = 1;
        messageEdited = false;
        failure = "";
      }
    } catch (error) {
      if (matches()) {
        failure = `${t("failure")} ${error.message}`;
        $("problem-error").textContent = failure;
        $("problem-error").hidden = false;
      }
    } finally {
      submitting = false;
      setBusy(false);
      setControlsDisabled(false);
      $("problem-next").textContent = t("send");
      if (matches()) {
        $("fault-status").textContent = "";
        $("fault").value = "none";
      }
      refresh();
    }
  };
  return {
    reset() {
      dialog.close();
      releaseFiles();
      answers = {};
      draftContext = null;
      step = 1;
      messageEdited = false;
      failure = "";
    },
    localize() {
      if (dialog.open && schema) {
        preserve();
        render();
      }
    },
  };
}
