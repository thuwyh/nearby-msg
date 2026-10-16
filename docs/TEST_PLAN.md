# Test Plan: Rich Media Messaging

Follow-up testing for voice, photo and video messages (scenario S1). The design is in [DESIGN.md](DESIGN.md).

## 1. Status

| Area | Status |
| --- | --- |
| Server rules: who can send what, file types, size limits, access, persistence, reset | ✅ Automated: `npm run check` (7 tests) |
| Type safety | ✅ `npm run typecheck` |
| UI flows in a desktop Chromium pane, with a synthetic mic and generated files | ✅ Tested by hand once |
| **Real microphone and camera** (desktop and phone) | ⏳ **Not tested yet**: the browser pane blocks capture |
| **Real phones** (iOS Safari, Android Chrome) | ⏳ Not tested yet |
| Safari and Firefox on desktop | ⏳ Not tested yet |
| Slow networks, large files near the limits, interruptions | ⏳ Not tested yet |
| Accessibility (screen reader, keyboard-only) | ⏳ Partly: labels and keyboard path exist, but no screen-reader pass yet |
| Automated browser (E2E) tests | ⏳ Not written yet (see §6) |

Priorities: **P0** blocks release, **P1** must be fixed before wider rollout, **P2** nice to have.

## 2. Environments

| ID | Device / OS | Browser | How to reach the app | Notes |
| --- | --- | --- | --- | --- |
| E1 | macOS | Chrome (latest) | `http://127.0.0.1:4310` | Records audio as webm/opus |
| E2 | macOS | Safari (latest) | `http://127.0.0.1:4310` | Records audio as mp4/aac |
| E3 | macOS or Windows | Firefox (latest) | `http://127.0.0.1:4310` | Records audio as ogg/webm |
| E4 | iPhone (iOS 17+) | Safari | `HOST=0.0.0.0`, then `http://<LAN-IP>:4310` | Plain http, so in-page mic isn't available and the fallback is used |
| E5 | Android 13+ | Chrome | same as E4 | Same as E4 |
| E6 | iPhone / Android | Safari / Chrome | **HTTPS** tunnel or local certificate | Needed to test in-page recording on a phone |

**Setup for each run**

1. Start the server with `npm run dev`. For E4–E6, start it with `HOST=0.0.0.0 npm run dev`.
2. Click **Reset demo**.
3. Use `sample-assets/leaking-sink.png`, plus a short real video recorded on each device.

## 3. Manual test cases

### 3.1 Voice: customer and support (P0)

| ID | Env | Steps | Expected |
| --- | --- | --- | --- |
| V-01 | E1–E3 | As Customer, **hold** 🎤 for about 5 s while speaking, then release over the button | The browser asks for mic permission the first time. The bar shows the timer and "Release to send". On release, a "Voice message · 0:05" bubble appears with no extra step. Support hears clear audio. |
| V-02 | E1–E3 | **Tap** 🎤, speak, tap **Done** | The clip appears in the tray with a player. Listen back, then **Send**. The message appears. |
| V-03 | E1–E3 | Hold 🎤, slide the pointer away until the bar turns red, then release | Nothing is sent and the tray stays empty. |
| V-04 | E1–E3 | Tap 🎤, then **Cancel** | Recording stops, nothing is added, and the mic indicator turns off. |
| V-05 | E1–E3 | Deny mic permission, then press 🎤 | The message "The microphone isn't available…" appears and the audio file picker opens. |
| V-06 | E1–E3 | Record for more than 2 min in each mode | Hold mode sends automatically at 2:00; tap mode moves the clip to the tray at 2:00. |
| V-07 | E1–E3 | Release in under 0.3 s on the first press, while the permission prompt is still open | It becomes tap mode after permission is granted; no clip is lost or sent by accident. |
| V-08 | E1, E2 | As Support, send a voice reply. As Customer, play it | It plays. The duration label matches the recording. |
| V-09 | E1↔E2 | Record in Safari, play in Chrome, and the other way round | Both play. Record any format that doesn't play in another browser as a bug (see §5). |
| V-10 | E4, E5 | Press 🎤 over plain http | The phone's own recorder or file chooser opens; the recording uploads and plays. |
| V-11 | E6 | Hold to talk on a touchscreen | No text selection, magnifier or context menu during the long press. Release sends. |
| V-12 | E1 | Use only the keyboard: Tab to 🎤, press Enter, speak, press Enter | Recording starts, then stops and goes to the tray for review. |
| V-13 | E1 | Start a recording, then switch identity or conversation | Recording is cancelled and the mic is released (the browser's mic indicator turns off). |
| V-14 | E1 | While a voice note is playing, have the other side send a message | Playback keeps going without restarting. |

### 3.2 Photo: customer (P0)

| ID | Env | Steps | Expected |
| --- | --- | --- | --- |
| P-01 | E1–E3 | 📷 → **Upload photos**, choose `leaking-sink.png`, add a caption, send | Upload progress shows, then "Ready to send". The bubble shows the thumbnail and caption, and clicking the thumbnail opens the full-size viewer. |
| P-02 | E1–E3 | 📷 → **Take photo** on desktop | The in-page camera opens with a preview. Taking the photo adds a JPEG to the tray. |
| P-03 | E4, E5 | 📷 → **Take photo** | The phone's native camera opens (rear camera). The photo uploads and is upright (check EXIF rotation). |
| P-04 | E4 | Upload a HEIC photo from the iPhone library | It uploads and **displays for Support in Chrome**. iOS usually converts to JPEG; if HEIC reaches Chrome as-is, record it as a known gap. |
| P-05 | E1 | Select 5 photos at once | 4 are added, and the message "You can attach up to 4 files" appears. |
| P-06 | E1 | Paste a screenshot into the text box; drag a photo onto the composer | Both add the photo to the tray. |
| P-07 | E1 | Upload a 12-megapixel, roughly 6 MB photo | It is shrunk to at most 2048 px JPEG before upload and looks acceptable. |
| P-08 | E1 | Upload a file over 20 MB that can't be decoded (for example a raw HEIC) | It is rejected before upload with "… is larger than 20 MB". |
| P-09 | E1 | Upload a PNG with transparency | It is shrunk onto a white background, not black. |
| P-10 | E1 | As Support, look for the 📷 / 🎥 buttons | They aren't shown. A direct API call returns 403 (already automated). |

### 3.3 Video: customer (P0)

| ID | Env | Steps | Expected |
| --- | --- | --- | --- |
| VD-01 | E1–E3 | 🎥 → **Upload video**, choose a 10–30 s mp4, send | Progress shows. Support can play it, seek and go fullscreen. |
| VD-02 | E1–E3 | 🎥 → **Record video** on desktop | The camera window opens. Start, stop and attach give a webm/mp4 with sound. |
| VD-03 | E4 | 🎥 → **Record video** on iPhone | The native camera records a `.mov` (quicktime), which uploads. **Check that it plays in desktop Chrome.** |
| VD-04 | E5 | Same as VD-03 on Android | An mp4 uploads and plays everywhere. |
| VD-05 | E1 | Upload a video of about 95 MB | It succeeds with smooth progress. Note how long it takes for both the sender and the viewer. |
| VD-06 | E1 | Upload a video over 100 MB | It is rejected before upload. With the browser check bypassed, the server returns 413. |
| VD-07 | E4, E5 | Play a video inside the chat | It plays inline (`playsinline`) without forcing fullscreen. |

### 3.4 Attachment tray and sending (P0/P1)

| ID | Steps | Expected |
| --- | --- | --- |
| T-01 | Add a photo, then remove it with ✕ before the upload finishes | The upload stops and the item disappears. |
| T-02 | Throttle to a slow 3G profile in devtools, add a video, try to send during upload | Send is disabled, then the message "Wait for uploads to finish" appears. Send works after the upload finishes. |
| T-03 | Go offline during an upload | The item shows "Upload failed" and **Retry**. Going back online and retrying works. |
| T-04 | Arm the **Fail before saving** fault, then send a photo and caption | The error appears; the text and tray are kept. Resending works. |
| T-05 | Arm **Save, then lose confirmation**, then send a photo | The error appears. Once the message shows up, the tray item is removed and nothing is sent twice. |
| T-06 | Send a message with 2 photos, 1 video and 1 voice clip | All four show in one bubble, in order. |
| T-07 | Send with only attachments and no text | It is accepted, and no empty caption is shown. |
| T-08 | Refresh the page while files are in the tray | The tray empties (by design; uploaded but unsent files remain on the server). |

### 3.5 Persistence, privacy and separation (P0)

| ID | Steps | Expected |
| --- | --- | --- |
| S-01 | Send each media type, restart the server, refresh | Everything is still there and plays. |
| S-02 | Click Reset demo | All media is gone. Old attachment URLs return 404. |
| S-03 | As Jordan (`pro-1`), request `GET /api/attachments/<id>` for a support-thread file | 404 (already automated). |
| S-04 | Upload a `.html` or `.svg` file renamed to `.png` | The type check either rejects it, or the file is served with `nosniff` and a sandbox CSP so it can't run in the app's origin. |
| S-05 | Upload a file named `"><img src=x onerror=alert(1)>.png` | The name is shown as plain text and no script runs. |

### 3.6 Accessibility and languages (P1)

| ID | Steps | Expected |
| --- | --- | --- |
| A-01 | VoiceOver (macOS and iOS) and TalkBack: move through the composer | The buttons read as "Voice", "Photo" and "Video", including at phone width where only icons show. The menus announce as expanded or collapsed. |
| A-02 | Recording bar | Screen readers announce status changes (`role=status`). |
| A-03 | Full-size viewer and camera window | Focus moves into the window, Escape closes it, and focus returns to where it was. |
| A-04 | Switch to 中文 | Every new label, hint, error and tray status is in Chinese. |
| A-05 | 200% zoom and 375 px width | No horizontal scroll; the toolbar wraps cleanly. |

### 3.7 Regression (P0)

| ID | Steps | Expected |
| --- | --- | --- |
| R-01 | Text-only send and receive between Customer and Platform | Same as before, including Enter / Shift+Enter. |
| R-02 | Professional view | No media buttons and the original text-only hint. |
| R-03 | Both fault modes with a text-only message | Same behavior as the original starter. |

## 4. Performance and capacity (P1)

| ID | Scenario | What to measure | Target |
| --- | --- | --- | --- |
| PF-01 | One 100 MB upload | Server memory peak; whether other requests stay responsive | Under 300 MB RSS; polling still works |
| PF-02 | Three 100 MB uploads at once | Memory and SQLite write time | No crash. Record the numbers to plan the move to object storage |
| PF-03 | A conversation with 50 media messages | Time to render; memory used by `blob:` URLs on a phone | Usable on a mid-range Android phone |
| PF-04 | A 30 MB voice file | Time until it starts playing (the whole file is downloaded first) | Record it; this supports adding range requests and streaming |
| PF-05 | Database size after PF-01 to PF-03, then reset | `.data/chat-v2.sqlite` size | Note whether the file shrinks after reset (a `VACUUM` may be needed) |

## 5. Known risks to check

1. **Some recordings may not play in other browsers.** Safari can't play webm/opus recorded in Chrome on older iOS, and a `.mov` from an iPhone may not play in Chrome. *Check:* V-09, VD-03. *Possible fix:* convert to common formats on the server.
2. **HEIC photos.** Chrome and Firefox can't display HEIC. *Check:* P-04. *Possible fix:* convert HEIC to JPEG when it's uploaded.
3. **Missing duration in recordings.** Recorded webm files often have no stored length, so the player shows `0:00` or `Infinity`. The label uses `durationMs` instead. *Check:* V-01 and V-08 on each browser.
4. **Phones over plain http.** In-page mic and camera are blocked. *Check:* V-10 and P-03 confirm the fallbacks; E6 confirms the in-page flow over HTTPS.
5. **Unsent uploads pile up.** Files uploaded but never sent stay in SQLite until reset. *Check:* PF-05. *Follow-up:* a scheduled clean-up job.

## 6. Automation to add later

| Priority | What | How |
| --- | --- | --- |
| P0 | Browser E2E tests for the flows in 3.1–3.4 | Playwright with Chromium's fake media flags (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, and `--use-file-for-fake-audio-capture=<wav>`). Use `setInputFiles` for uploads. |
| P0 | Hold vs tap timing, cancel by sliding away, 2-minute auto-stop | Playwright `mouse.down/up/move` with a mocked clock |
| P1 | Playback works across browsers | Playwright on WebKit and Firefox, playing files recorded on each other |
| P1 | No restart while playing (V-14) | Start playback, send a message from the other identity via the API, check `audio.currentTime` keeps increasing |
| P1 | Text and labels in both languages | A snapshot of all `dictionary` keys used in the page; fail if any string is missing for either language |
| P2 | Visual regression of the composer at 375 / 768 / 1280 px | Playwright screenshots |
| P2 | Load test for uploads | `autocannon` or k6 against `/attachments` with 1–10 concurrent 50 MB bodies |
| P2 | Run checks in CI | GitHub Actions running `npm ci && npm run typecheck && npm run check` (and later Playwright) on each PR |

## 7. Exit criteria for wider rollout

- Every **P0** case passes on E1, E2, E4 and E5.
- Each risk in §5 is fixed, or accepted with a documented decision.
- Playwright P0 tests run in CI.
- PF-01 and PF-02 are measured, and the storage approach is confirmed or replaced.
