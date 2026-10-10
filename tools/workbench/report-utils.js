export function reportQuestions(schema, categoryId) {
  const category = schema.categories.find((c) => c.id === categoryId);
  return [...schema.common, ...category.questions];
}

export function quickChoices(question, category, answers) {
  const set = question.choiceSets?.find((set) =>
    set.values.includes(answers[set.field]),
  );
  return (
    set?.choices ??
    category.commonChoices?.[question.id] ??
    question.choices ??
    []
  );
}

export function generateSummary(
  schema,
  categoryId,
  answers,
  attachments = [],
  language = "en",
) {
  const index = language === "zh-CN" ? 1 : 0;
  const category = schema.categories.find((c) => c.id === categoryId);
  const label = (value) => value[index];
  const lowerFirst = (value) => value.charAt(0).toLowerCase() + value.slice(1);
  const uncertain = (value) => ["Not sure", "不确定"].includes(value?.trim());
  const sentence = (value) =>
    /[.!?。！？]$/.test(value.trim())
      ? value.trim()
      : value.trim() + (index ? "。" : ".");
  const subject = answers[category.summarySubject]?.trim();
  const parts = [
    index
      ? `${answers.location?.trim() || "位置不确定"}有${label(category.label)}问题`
      : `I need help with ${subject && !uncertain(subject) ? "my " + lowerFirst(subject) : "a " + lowerFirst(label(category.label)) + " problem"} in ${answers.location?.trim() || "an unknown location"}`,
  ];
  if (answers.observation?.trim()) parts.push(answers.observation.trim());
  // Category details first, then timeline, attempts and impact. Nothing is inferred.
  for (const q of [...category.questions, ...schema.common]) {
    const answer = answers[q.id]?.trim();
    if (
      !answer ||
      !q.summaryPrefix ||
      (!index && q.id === category.summarySubject && !uncertain(answer))
    )
      continue;
    if (uncertain(answer) && q.uncertainSummary)
      parts.push(label(q.uncertainSummary));
    else
      parts.push(
        label(q.summaryPrefix) +
          (!index && !label(q.summaryPrefix).endsWith(": ")
            ? lowerFirst(answer)
            : answer),
      );
  }
  const photos = attachments.filter((a) => a.type.startsWith("image/")).length;
  const videos = attachments.filter((a) => a.type.startsWith("video/")).length;
  if (photos)
    parts.push(
      index
        ? `已附${photos}张照片`
        : photos === 1
          ? "Photo attached"
          : `${photos} photos attached`,
    );
  if (videos)
    parts.push(
      index
        ? `已附${videos}个视频`
        : videos === 1
          ? "Video attached"
          : `${videos} videos attached`,
    );
  return parts.map(sentence).join(index ? "" : " ");
}
