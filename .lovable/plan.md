# Anonymous Space — Implementation Plan

Aurix's signature feature. Any group can spin up a temporary space where identities are concealed, ghost messages disappear after viewing, and everything is permanently destroyed when the last participant leaves.

Delivered in 3 shippable phases so we can validate each before layering the next.

---

## Phase 1 — Foundations (backend + Ghost Messages)

**Database (single migration)**

```text
anonymous_spaces
  id, group_chat_id (FK chats), title, max_participants,
  auto_close_at, created_by, created_at, destroyed_at

anonymous_participants
  space_id, user_id, alias, joined_at, left_at
  UNIQUE(space_id, user_id)
  UNIQUE(space_id, lower(alias))

anonymous_messages
  id, space_id, sender_participant_id, content, media_url,
  message_type, reply_to, created_at
  (no user_id — only participant id, which is destroyed on close)

messages.ghost_reveal_seconds  int null       -- ghost timer
messages.ghost_revealed_at     timestamptz    -- set on first reveal
```

- Enable RLS + GRANTs on all three tables per project rules.
- RPCs: `create_anonymous_space`, `join_anonymous_space` (assigns/validates alias), `leave_anonymous_space`, `destroy_anonymous_space_if_empty` (trigger on leave), `reveal_ghost_message` (sets `ghost_revealed_at` once, only for recipients).
- Destroy path: hard `DELETE` cascades — messages, participants, alias map, space row. No soft delete, no audit trail.
- Alias validation: profanity filter + reserved-name list + collision check inside the RPC.
- Realtime enabled on `anonymous_messages` and `anonymous_participants`.

**Ghost Messages (works in all chats immediately)**

- Composer gets a Ghost toggle with timer picker (1s / 2s / 5s / 10s / 30s / 1m / custom).
- Recipient sees a blurred "👻 Ghost Message — Tap to reveal" bubble.
- On reveal: call `reveal_ghost_message`, start local timer, animate dissolve, then hard-delete the row (client calls delete; RLS restricts to sender OR revealed recipient).
- Long-press = preview without starting timer (client-only, never calls reveal RPC).
- Ghost media reuses the same reveal/timer/delete flow; blurred thumbnail until reveal.

## Phase 2 — Anonymous Space UI

**Space card in group chat**
- Rendered as a special message type `anonymous_space_invite`.
- Premium floating card: rounded, soft shadow, breathing scale animation, subtle particle field. No neon/RGB.
- Shows title, live participant count, [Enter] button.

**Enter flow**
- Cinematic transition (700–900ms): haptic → chat blur → messages collapse inward → dark fade → space fades in.
- Skip affordance: "Tap anywhere to skip" appears at ~200ms with low opacity. Tap accelerates remaining animation (does not hard-cut).
- First-entry welcome overlay with the exact copy from the brief, auto-fades after ~4s.
- Identity picker: Random (rerollable) or Custom, with live validation.

**Inside the space**
- Distinct visual language: `#0B0B0D` background, `#141417` cards, `#1C1C20` panels, deep violet or ice cyan accent (settings toggle).
- Slightly larger line-height and letter-spacing than normal chats to create the "different environment" feeling.
- No avatars, no usernames, no online/read/typing-by-name.
- Typing indicator: "A participant is typing…"
- Message bubbles show only alias; alias color is deterministic hash of participant id (only stable within the space's lifetime).
- Leave button in header; auto-close countdown pill if timer set.

**Gestures** (reuse existing swipe-to-reply infra from `RoomChat`/`ChatWindow`)
- Swipe → Reply
- Long swipe → Ghost Reply
- Double tap → quick reaction
- Long press → reaction menu
- Hold ghost message → preview without starting timer
- Pinch → timeline mode (compact density)
- Two-finger swipe → jump to unread

## Phase 3 — Polish

- **Motion settings** (Settings → Motion): Minimal / Balanced / Cinematic / Accessibility. Persisted in `user_settings`. Honors `prefers-reduced-motion`. Skip-frequency heuristic surfaces the one-time "shorter transitions?" suggestion.
- **Haptics** via `navigator.vibrate` with distinct patterns for: enter space, ghost destroyed, identity selected, space destroyed.
- **Sound design** — small library of soft click/whoosh/pulse; muted by default, toggle in Motion settings.
- **Accessibility** — every transition skippable, screen-reader labels on alias/ghost states, 44px tap targets, AA contrast on both accent colors.
- **Perf pass** — virtualized message list inside space, `will-change` only during transitions, RAF-driven particle field with visibility pause.

---

## Technical notes

- New files land under `src/components/anonymous/` (SpaceCard, EnterTransition, IdentityPicker, AnonymousChatWindow, GhostBubble, GhostComposerToggle) and `src/hooks/useAnonymousSpace.tsx`, `src/hooks/useGhostMessage.tsx`.
- Existing `ChatWindow` gets a Ghost composer control and Ghost bubble renderer; no fork of the chat surface.
- Group header gets an "Anonymous Space" entry in the actions sheet.
- All destroy operations run in SQL (RPC + cascade), so a client crash mid-leave still destroys correctly on next join attempt or a scheduled cleanup RPC.
- Turnstile/rate-limit hooks from the existing security layer wrap create/join to prevent abuse.

## Out of scope (call out before I build)

- Voice/video calls inside Anonymous Space.
- Cross-device push notification copy changes (only in-app rendering).
- Community/channel variant — spec says any group; I'll gate creation to `is_group=true` chats only.

---

**Ship order:** Phase 1 → verify Ghost works end-to-end → Phase 2 → verify enter/leave/destroy → Phase 3 polish. Each phase is independently mergeable.

Approve and I'll start with Phase 1.
