import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { Chat, HttpError } from "../src/chat.ts";
import { Store } from "../src/store.ts";
import { requireAttachments, mediaLimits } from "../src/media.ts";

const image = readFileSync(
  new URL("../sample-assets/leaking-sink.png", import.meta.url),
);
const video = readFileSync(
  new URL("./fixtures/short-video.webm", import.meta.url),
);
const attachment = (data = image, type = "image/png") => ({
  name: "Evidence",
  type,
  data: data.toString("base64"),
});
const report = {
  version: 1,
  categoryId: "plumbing",
  answers: { location: "Kitchen", observation: "Water is leaking" },
};
const status = (code: number) => (e: unknown) =>
  e instanceof HttpError && e.status === code;

test("validates photos and videos and rejects unsupported or mismatched content", () => {
  const files = requireAttachments([
    attachment(),
    attachment(video, "video/webm"),
  ]);
  assert.equal(files[0].size, image.length);
  assert.equal(files[1].type, "video/webm");
  assert.deepEqual(files[1].data, video);
  assert.throws(
    () => requireAttachments([attachment(Buffer.from("<html>bad</html>"))]),
    status(400),
  );
  assert.throws(
    () => requireAttachments([attachment(image, "image/svg+xml")]),
    status(400),
  );
  assert.throws(
    () => requireAttachments([{ ...attachment(), data: "not base64" }]),
    status(400),
  );
  assert.throws(
    () => requireAttachments([{ ...attachment(), name: " " }]),
    status(400),
  );
});
test("enforces attachment count, individual size and aggregate size", () => {
  assert.throws(
    () => requireAttachments(Array(4).fill(attachment())),
    status(400),
  );
  const large = Buffer.alloc(mediaLimits.maxFileBytes + 1);
  image.copy(large, 0, 0, 8);
  assert.throws(() => requireAttachments([attachment(large)]), status(413));
  const medium = Buffer.alloc(6 * 1024 * 1024);
  image.copy(medium, 0, 0, 8);
  assert.throws(
    () => requireAttachments(Array(3).fill(attachment(medium))),
    status(413),
  );
});
test("media is atomic with its message, private to the conversation, and cleared on reset", () => {
  const store = new Store(":memory:");
  try {
    const chat = new Chat(store);
    const message = chat.send("customer", "support-thread", {
      text: "Photo and video attached",
      report,
      attachments: [attachment(), attachment(video, "video/webm")],
    });
    assert.equal(message.attachments?.length, 2);
    const id = message.attachments![0].id;
    assert.deepEqual(
      chat.attachment("support", "support-thread", id).data,
      image,
    );
    assert.throws(
      () => chat.attachment("pro-1", "support-thread", id),
      status(404),
    );
    assert.throws(
      () => chat.attachment("customer", "another-thread", id),
      status(404),
    );
    assert.throws(
      () =>
        chat.send("customer", "support-thread", {
          text: "Photo",
          attachments: [attachment()],
        }),
      status(400),
    );
    assert.equal(store.messages("support-thread").length, 1);
    store.reset();
    assert.throws(
      () => chat.attachment("customer", "support-thread", id),
      status(404),
    );
    assert.equal(store.messages("support-thread").length, 0);
    const save = store.putMedia.bind(store);
    let count = 0;
    store.putMedia = (...args) => {
      if (++count === 2) throw new Error("Storage failure");
      save(...args);
    };
    assert.throws(
      () =>
        chat.send("customer", "support-thread", {
          text: "Attached",
          report,
          attachments: [attachment(), attachment(video, "video/webm")],
        }),
      /Storage failure/,
    );
    assert.equal(store.messages("support-thread").length, 0);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS count FROM media").get()!.count,
      0,
    );
  } finally {
    store.db.close();
  }
});
