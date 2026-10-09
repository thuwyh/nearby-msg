# Nearby Chat

30 minutes · AI welcome

Alex needs a plumber. Help customers, professionals and platform support communicate through Nearby.

A working text conversation between Alex and Nearby Support, with Customer, Professional and Platform views. Switch to Platform to reply. Jordan and Sam start without conversations. No messages are preloaded.

Pick your priorities. Implement working features in the UI and backend, and write your own tests. You are not expected to finish all ten.

## T1 · Send a photo

Alex wants to show the plumber where the sink is leaking.

Start with the existing support conversation

- Choose a PNG, JPEG or WebP image (up to 2 MiB), send it, and open it at a larger size on either side. Text is optional.
- The image remains available after refresh. Reject unsupported files and oversized images with a clear error.

## T2 · Message a professional

Alex wants to discuss the repair separately with Jordan and Sam.

Start with the existing support conversation

- Start a conversation with either professional. Switch to that professional to read and reply. Reopening a contact returns to the same conversation.
- Jordan and Sam cannot see each other’s conversations. Conversations and messages survive refresh and restart.

## T3 · Recall a message

A sender notices they sent the wrong information.

Start with the existing support conversation

- A sender can recall their own message. Both sides see “Message recalled”, including after refresh. Keep the message’s place in the conversation.
- Another person cannot recall it. Recalled content is no longer returned to recipients; if you also build images, search or quotes, they must respect recall.

## T4 · Show unread messages

Alex wants to know which conversations need attention.

Start with the existing support conversation

- Show an unread count per conversation. Opening a conversation marks the messages actually viewed as read; your own messages do not count.
- Read status belongs to each person and survives refresh. Reading one conversation does not clear another.

## T5 · Reply to a specific message

Several repair details are being discussed at once.

Start with the existing support conversation

- Select a message to reply to. Show a preview before sending and the quoted message with the reply; allow cancelling the selection.
- Quotes can only reference the same conversation. If recall is implemented, recalled content disappears from quotes too.

## T6 · Keep separate drafts

Alex switches between two plumbers while comparing their advice.

Requires: T2

- Keep unsent text separately for each conversation when switching or refreshing. A successful send clears only that conversation’s draft.
- Drafts are private to each identity: switching to a professional must not expose Alex’s draft. A failed send preserves the draft.

## T7 · Retry a failed send

A weak connection leaves Alex unsure whether a message went through.

Start with the existing support conversation

- Use Simulation controls to fail the next send. Show a failed or unconfirmed message with a Retry action; retry the same content.
- Handle both failure before saving and lost confirmation after saving. Repeated retries of one message leave exactly one copy for the recipient; two intentional identical messages remain separate.

## T8 · Search the conversation

Alex wants to find a detail mentioned earlier.

Start with the existing support conversation

- Search text in the current conversation, show matching messages, and select a result to locate it in the conversation. Clearing search restores the normal view.
- Do not expose another conversation’s messages. If recall is implemented, recalled content cannot appear in results.

## T9 · Block a professional

Alex no longer wants messages from a particular professional.

Requires: T2

- Alex can block or unblock a professional. While blocked, new messages from that professional are rejected and the sender sees a clear explanation.
- Existing history stays visible. Blocking persists after refresh and does not affect other conversations; unblocking permits new messages without delivering previously rejected ones.

## T10 · Invite platform support

Alex needs the platform to help resolve a disagreement with a plumber.

Requires: T2

- Alex can invite Nearby Support into one professional conversation. Platform view can then read its history and reply; Alex and the professional both see the reply.
- The platform cannot read private conversations before being invited. Repeated invitations do not duplicate the conversation, and unrelated conversations remain private.

## When features meet

Keep conversations and identities separate. Data should survive refresh. If you combine recall with images, quotes or search, recalled content must disappear there too. Retries must not create duplicate messages.

## Submit a PR

Fork the repository and open a PR to thuwyh/nearby-msg. Include completed task IDs, demo steps, test commands and remaining gaps.

Show that your chosen features work together. Quality, prioritization and verification matter alongside completion.
