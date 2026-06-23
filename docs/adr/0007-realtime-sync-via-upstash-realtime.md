# Real-time sync via Upstash Realtime, channel per room+date

Collaboration (#14) needs server→client push: when one solver enters or clears a word, every other client viewing the same room+date sees it without refreshing. The sync unit is coarse and low-frequency ("slot X changed to word Y"), the fidelity is minimal (shared progress, presence as a count — no cursors, no attribution), and last-write-wins per slot. We chose **Upstash Realtime** as the transport.

## Decision

- **Mechanism:** Upstash Realtime (SSE + Redis pub/sub, packaged). The app already uses Upstash Redis for storage, so this is the same vendor and account — no new infrastructure.
- **Channel:** `room:<roomName>:<date>` — the room+date being viewed. Two clients see the same state iff they're subscribed to the same channel, which is exactly the subscription key.
- **Emit:** server-action side-effect. After `setWordAction` writes to `sbs:room:<name>:<date>:words`, it emits a `word.changed` event `{ slotId, word: string | null }` to that channel. The write and the notification share one server-side code path, so they can't drift.
- **Subscribe:** a `useRealtime` hook bound to the current route's room+date. On `word.changed`, the client applies the slot patch to its SWR cache directly (the event carries enough data — no refetch needed).
- **Presence:** rides on subscriber join/leave (or a subscriber-count API), giving the "N people solving" count for minimal-fidelity collaboration.

## Considered options

- **SWR polling (rejected).** Simplest — clients refetch every 2–3s. Works anywhere, no push infra. Rejected because Upstash Realtime removes the "roll your own SSE" cost that made polling attractive by comparison, and push feels noticeably better than a 2–3s lag even for a tolerant use case. Polling remains a fallback if Realtime proves finicky.
- **Raw SSE + Redis pub/sub on Vercel (rejected).** Same mechanism Realtime provides, but hand-rolled. SSE fights Vercel's serverless model (function duration caps, concurrent-connection limits), and the plumbing is exactly what Realtime packages up. No reason to build it ourselves.
- **Cloudflare Durable Objects (rejected for now).** Purpose-built for collaborative rooms with presence, and the author has Workers/Durable Objects familiarity. Over-build for a 2-person daily ritual at minimal fidelity. Remains the natural upgrade path if collaboration grows cursors, selections, or many-participant rooms — the upgrade is contained to the sync layer.

## Consequences

- **Deeper Upstash coupling.** Storage and sync are now both Upstash-specific. Not a new vendor, but moving off Upstash later means replacing both. Acceptable given satisfaction with the existing Redis setup.
- **The emit pattern is from server actions, not Upstash Workflow.** The Realtime docs are Workflow-centric (background-job progress), but the `realtime.channel(name).emit(event, data)` API is standalone and callable from any server code. Server actions are the natural emit site here — spike emit-from-action early to confirm it behaves as expected before building on it.
- **Minimal-fidelity presence rides free.** Subscriber count gives "N people solving" with no separate presence mechanism. If fidelity later grows to named presence (decision (B)) or attribution (decision (C)), join/leave events carry a client UUID that can map to a display name — additive, no rewrite.
- **Billing per message/connection.** Negligible for a 2-person daily ritual; worth eyeballing free-tier limits if collaboration scales.
- **LWW per slot is still the conflict model.** Realtime delivers events; it doesn't merge them. Two simultaneous writes to the same slot are resolved by Redis's last-write-wins on `hset`; both clients receive the winning value via the channel. No CRDT/OT layer is introduced.
