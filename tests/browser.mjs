import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(join(tmpdir(), "nearby-browser-"));
const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: "0", CHAT_DB: join(directory, "chat.sqlite") },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  const url = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error("Server did not start: " + output)),
      10000,
    );
    child.stdout.on("data", (data) => {
      output += data;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Server exited: " + code));
    });
  });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const choose = (id, value) =>
    page
      .locator(`.choice-list[data-question="${id}"]`)
      .getByRole("button", { name: value, exact: true })
      .click();
  const photo = join(root, "sample-assets/leaking-sink.png");
  const video = join(root, "tests/fixtures/short-video.webm");
  await page.goto(url);
  await page.locator("#describe-problem").waitFor({ state: "visible" });
  await page.click("#describe-problem");
  await page.click("#problem-next");
  assert.equal(await page.locator("#problem-step").textContent(), "1 / 3");
  await choose("location", "Kitchen");
  await choose("fixture", "Toilet");
  assert.equal(
    await page
      .locator('.choice-list[data-question="water"]')
      .getByRole("button", { name: "Under the sink", exact: true })
      .count(),
    0,
  );
  await choose("water", "Around the base");
  await choose("fixture", "Kitchen sink");
  assert.equal(await page.inputValue("#problem-water"), "");
  await choose("observation", "Water is not draining");
  assert.equal(await page.locator("#problem-water").isVisible(), false);
  await choose("observation", "Water is leaking");
  await choose("water", "Not sure");
  assert.equal(await page.locator("#problem-uncertainty").isVisible(), true);
  await choose("water", "Pipe under the basin");
  await page.click("#problem-next");
  await choose("started", "Today");
  await choose("frequency", "When the faucet is running");
  await page.click("#problem-back");
  await choose("fixture", "Toilet");
  await page.click("#problem-next");
  assert.equal(await page.inputValue("#problem-frequency"), "");
  await choose("frequency", "When flushing");
  await page.click("#problem-back");
  await choose("fixture", "Kitchen sink");
  await choose("water", "Pipe under the basin");
  await page.click("#problem-next");
  assert.equal(await page.inputValue("#problem-frequency"), "");
  await choose("frequency", "When the faucet is running");
  await page.fill("#problem-tried", "Placed a bucket underneath");
  await choose("severity", "Cannot use it");
  await page.fill(
    "#problem-notes",
    "Cabinet floor is wet <script>bad()</script>",
  );
  await page.locator("#problem-files").setInputFiles([photo, video]);
  assert.equal(await page.locator(".attachment-previews figure").count(), 2);
  await page
    .locator("#problem-files")
    .setInputFiles({
      name: "fake.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await page.locator("#problem-error").waitFor({ state: "visible" });
  assert.equal(await page.locator(".attachment-previews figure").count(), 2);
  await page.locator("#problem-files").setInputFiles([photo, video]);
  assert.match(await page.locator("#problem-error").textContent(), /up to 3/);
  assert.equal(await page.locator(".attachment-previews figure").count(), 2);
  await page.click("#problem-close");
  await page.click("#describe-problem");
  assert.equal(
    await page.inputValue("#problem-tried"),
    "Placed a bucket underneath",
  );
  assert.equal(await page.locator(".attachment-previews figure").count(), 2);
  await page.click("#problem-next");
  let summary = await page.inputValue("#problem-message");
  for (const part of [
    "my kitchen sink",
    "pipe under the basin",
    "today",
    "when the faucet is running",
    "Placed a bucket",
    "Cannot use it",
    "Cabinet floor is wet",
    "Photo attached",
    "Video attached",
  ])
    assert.ok(summary.includes(part), summary);
  await page.fill("#problem-message", "My own wording");
  await page.click("#problem-back");
  await choose("started", "Yesterday");
  await page.click("#problem-next");
  assert.equal(await page.inputValue("#problem-message"), "My own wording");
  await page.click("#problem-regenerate");
  assert.match(await page.inputValue("#problem-message"), /yesterday/);
  await page.click('[data-remove="1"]');
  assert.doesNotMatch(
    await page.inputValue("#problem-message"),
    /Video attached/,
  );
  await page.locator("#problem-files").setInputFiles(video);
  assert.match(await page.inputValue("#problem-message"), /Video attached/);
  await page.click("#problem-next");
  await page.locator("#problem-dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(() => {
    const img = document.querySelector(".chat-attachments img");
    const video = document.querySelector(".chat-attachments video");
    return img?.naturalWidth > 0 && video?.readyState >= 1;
  });
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector(".chat-attachments img")?.naturalWidth > 0,
  );
  await page.locator("[data-edit-report]").click();
  await page.locator("#summary-dialog").waitFor({ state: "visible" });
  await page.fill("#summary-text", "Corrected summary: leak under the kitchen sink.");
  await page.click("#summary-save");
  await page.locator("#summary-dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.querySelectorAll(".problem-card").length === 2);
  assert.match(await page.locator(".bubble").last().textContent(), /Corrected summary/);
  assert.match(await page.locator(".bubble").first().textContent(), /my kitchen sink/);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".problem-card").length === 2);
  await page.click('[data-role="support"]');
  await page.waitForFunction(
    () =>
      document.getElementById("identity-name").textContent === "Nearby Support",
  );
  await page.waitForFunction(
    () => document.querySelector(".chat-attachments video")?.readyState >= 1,
  );
  assert.equal(await page.locator("#describe-problem").isVisible(), false);
  assert.equal(await page.locator("[data-edit-report]").count(), 0);
  await page.fill("#message-input", "Thanks, we can help.");
  await page.click("#send");
  await page.waitForFunction(() =>
    document
      .getElementById("message-list")
      .textContent.includes("Thanks, we can help."),
  );
  await page.click('[data-role="professional"]');
  await page.waitForFunction(
    () => document.getElementById("identity-name").textContent === "Jordan",
  );
  assert.equal(await page.locator(".chat-attachments").count(), 0);
  await page.click('[data-role="customer"]');
  await page.locator(".problem-card").first().waitFor();
  await page.click("#language");
  await page.waitForFunction(() =>
    document.querySelector(".problem-card").textContent.includes("水管与漏水"),
  );
  await page.click("#language");
  for (const [category, observation, specific, option] of [
    ["walls", "There is a hole", "damage", "Hole"],
    ["electrical", "Lights are flickering", "device", "Light"],
    ["other", "Not sure", null, null],
  ]) {
    await page.click("#describe-problem");
    await page.selectOption("#problem-category", category);
    await choose("location", "Bedroom");
    await choose("observation", observation);
    if (specific) await choose(specific, option);
    await page.click("#problem-next");
    if (category === "walls") {
      await choose("size", "Palm-sized");
      await page.click("#problem-next");
      assert.match(await page.inputValue("#problem-message"), /Palm-sized/);
    } else await page.click("#problem-skip-details");
    assert.doesNotMatch(
      await page.inputValue("#problem-message"),
      /Photo attached|Video attached/,
    );
    await page.click("#problem-next");
    await page.locator("#problem-dialog").waitFor({ state: "hidden" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#describe-problem");
  await page.selectOption("#problem-category", "plumbing");
  await choose("location", "Kitchen");
  await choose("observation", "Water is leaking");
  await choose("water", "Not sure");
  await page.click("#problem-next");
  await page.locator("#problem-files").setInputFiles(photo);
  await page.click("#problem-skip-details");
  assert.match(
    await page.inputValue("#problem-message"),
    /not sure where it comes from/,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.click("#problem-close");
  await page.click(".simulation summary");
  await page.selectOption("#fault", "before-save");
  await page.click("#arm");
  await page.click("#describe-problem");
  await page.click("#problem-next");
  await page.locator("#problem-error").waitFor({ state: "visible" });
  assert.equal(await page.locator(".attachment-previews figure").count(), 1);
  await page.click("#problem-next");
  await page.locator("#problem-dialog").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: contextual choices, uncertainty, optional details, photo/video previews and playback, file limits, editable/regenerated summaries, persistence, Support replies, identity separation, Chinese labels, mobile layout, and failed-send retry.",
  );
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
  }
  await rm(directory, { recursive: true, force: true });
}
