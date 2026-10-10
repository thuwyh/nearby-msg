import assert from "node:assert/strict";
import { test } from "node:test";
import { problemSchema } from "../src/problems.ts";
import {
  generateSummary,
  quickChoices,
} from "../tools/workbench/report-utils.js";

test("summary includes source, timing, attempts, severity, notes and actual attachments", () => {
  const text = generateSummary(
    problemSchema,
    "plumbing",
    {
      location: "Kitchen",
      observation: "Water is leaking",
      fixture: "Kitchen sink",
      water: "Pipe under the basin",
      started: "Today",
      frequency: "When the faucet is running",
      tried: "Placed a bucket underneath",
      severity: "Cannot use it",
      notes: "Cabinet floor is wet",
    },
    [{ type: "image/png" }, { type: "video/webm" }],
  );
  for (const part of [
    "my kitchen sink",
    "Water is leaking",
    "pipe under the basin",
    "today",
    "when the faucet is running",
    "Placed a bucket",
    "Cannot use it",
    "Cabinet floor is wet",
    "Photo attached",
    "Video attached",
  ])
    assert.ok(text.includes(part), text);
});
test("uncertainty is explicit, and omitted details and absent media are not invented", () => {
  const text = generateSummary(problemSchema, "plumbing", {
    location: "Kitchen",
    observation: "Not sure",
    water: "Not sure",
    started: "Not sure",
  });
  assert.match(text, /I'm not sure where it comes from/);
  assert.match(text, /I'm not sure when it started/);
  assert.doesNotMatch(text, /attached|I've tried|Impact:/);
  const chinese = generateSummary(
    problemSchema,
    "walls",
    { location: "卧室", observation: "有裂缝", size: "手掌大小" },
    [{ type: "image/png" }],
    "zh-CN",
  );
  assert.match(chinese, /手掌大小/);
  assert.match(chinese, /已附1张照片/);
});
test("quick choices depend on the fixture, and summaries work for every category", () => {
  const plumbing = problemSchema.categories.find((c) => c.id === "plumbing");
  const water = plumbing.questions.find((q) => q.id === "water");
  assert.ok(
    quickChoices(water, plumbing, { fixture: "Toilet" }).some(
      (c) => c[0] === "Around the base",
    ),
  );
  assert.ok(
    !quickChoices(water, plumbing, { fixture: "Toilet" }).some(
      (c) => c[0] === "Under the sink",
    ),
  );
  for (const category of problemSchema.categories) {
    assert.match(
      generateSummary(problemSchema, category.id, {
        location: "Room",
        observation: "Something happened",
      }),
      /Something happened/,
    );
  }
});
