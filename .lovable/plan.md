# Aura Music Presence + Listen Together

Ship in one pass, phased internally so you can test as it lands.

## What ships

### Phase 1 — Foundation & Spotify presence
- **Spotify PKCE OAuth** (no client secret, browser-safe). You paste a Spotify Client ID; the app handles the rest.
- **Live now-playing**: polls Spotify Web API every 20s while the tab is active; upserts to `music_presence` table. Realtime broadcasts to friends.
- **Provider abstraction**: `MusicProvider` interface — Spotify implemented now; Apple/YT Music/Amazon stubs render as "search & share" only.
- **Music Settings panel** with all 6 privacy toggles (show song, show artwork, friends visibility, allow listen-together, auto-share, hide activity) + Preferred Provider picker.
- **Profile "Currently Listening"** card (album art, title, artist, "Open in Spotify" deep link).
- **Chat header music banner** — compact, appears when peer is listening and privacy allows. Tap → expands.

### Phase 2 — Share & Listen Together
- **Share Music dialog** with Spotify Search API — search tracks/albums/artists/playlists, send as a rich card in any chat or room.
- **Music message card** rendered in `ChatWindow` (new message metadata type `music_share`) with album art + Open in App button.
- **Listen Together invite**: sends a special card. Recipient taps *Join Session* → opens the track in Spotify (native app deep link `spotify:track:ID` with web fallback). Position sync is **not** promised — browsers can't reliably control the native app; we open the same track at t=0 in both clients. Session state tracked in `listen_together_sessions`.
- **Notifications** row inserted for: friend started listening (throttled), invite received, invite accepted.

### Phase 3 — Rooms & AI
- **Room now-playing**: room owner/admin can set "Now playing in room" (any Spotify track); members see it in room header with Join Listening button.
- **AI music recommendations**: adds a "🎵 Suggest music" action in AI Tools sheet — uses existing `aiCall` + a new server fn that returns 3 track queries based on last N messages' mood; renders as tappable Spotify search deep links.

## What I'm NOT promising (and why)
- **Auto-detecting music from Apple/YT Music/Amazon native apps** — browsers can't read what those apps are playing. Those providers get the manual **share** path only.
- **True cross-user playback sync** — Spotify's Web Playback SDK only controls playback in a browser tab, not the native app the user is actually using. We open the same track; the OS handles the rest.
- **Push notifications** — in-app notification rows only (already the app's pattern).

## Prerequisites you need to do
1. Go to <https://developer.spotify.com/dashboard>, create an app.
2. Add redirect URI: `https://<your-published-domain>/music/callback` (and the preview URL if you want to test in preview).
3. Copy the Client ID → paste when I open the secret form.

## Technical section

### DB migration
- `music_connections(user_id PK, provider, access_token, refresh_token, expires_at, scope, connected_at)` — RLS: user owns row.
- `music_presence(user_id PK, provider, track_id, track_name, artist, album, album_art_url, external_url, is_playing, progress_ms, duration_ms, updated_at)` — RLS: read if `can_view_music(auth.uid(), user_id)` (helper checks settings + share_dm + block). Added to `supabase_realtime`.
- `music_settings(user_id PK, provider default 'spotify', show_current_song, show_album_art, allow_friends_see, allow_listen_together, auto_share, hide_activity)` — RLS: user owns.
- `listen_together_sessions(id, host_id, guest_id, chat_id nullable, track_id, provider, status ['pending','accepted','declined','ended'], created_at, updated_at)` — RLS: host or guest.
- `music_recent_tracks(id, user_id, track_id, track_name, artist, album_art_url, external_url, played_at)` — RLS: read if `can_view_music`.
- `messages.metadata jsonb` (added if missing) — carries `{ kind: 'music_share'|'listen_together_invite', ...track }`.

### Files
- `src/lib/music/spotify.ts` — PKCE helpers, token refresh, `getCurrentlyPlaying`, `search`.
- `src/lib/music/provider.ts` — `MusicProvider` interface + registry.
- `src/lib/music-config.functions.ts` — server fn returning `SPOTIFY_CLIENT_ID` to the browser (safe; it's public).
- `src/hooks/useMusic.tsx` — connection state, polling loop, settings CRUD, presence subscribers, share/invite helpers.
- `src/components/music/{MusicPresenceCard,MusicHeaderBanner,MusicSettingsSection,ShareMusicDialog,MusicMessageCard,ListenTogetherInvite}.tsx`
- `src/routes/music.callback.tsx` — completes PKCE exchange.
- Wire into: `SettingsPanel`, `ProfileView`, `ChatWindow` (header + composer + message renderer), `RoomChat` (header + message renderer), `AiToolsSheet` (recommendations tab).

### Not touched
- Auth, existing chat/rooms/stories/calls logic, existing themes.

Ready to build. Say "go" and I'll open the Spotify Client ID secret form first, then ship the migration + all files.