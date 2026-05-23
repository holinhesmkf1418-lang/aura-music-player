# AI Music Agent Core Design

## Goal

Upgrade the current AI assistant from a chat-based search box into a music console agent. The assistant should understand multi-turn music intent, reuse the current recommendation context, and execute core player actions directly.

The first version targets the main pain shown in the current UI: after a user asks for a theme such as "夏天相关的", follow-up requests like "换几首" must continue that theme, exclude previous results, and return a fresh batch. The assistant must not treat "换几首" as a literal search keyword.

## Product Scope

The selected product direction is "music console agent".

The first version supports:

- New recommendations from natural language.
- Refreshing or replacing recommendations, such as "换几首" and "再来点".
- Adjusting the current recommendation constraints, such as "更欢快一点", "不要这么伤感", "中文多一点", or "新一点".
- Playing a referenced result, such as "播放第二首".
- Finding similar songs from a referenced result, such as "类似第一首".
- Adding current or referenced results to the queue.
- Keeping the current chat context on the frontend and sending it to the backend on each turn.
- Using mixed intelligence: simple requests return quickly; complex requests trigger deeper AI ranking.

The first version does not support:

- Persistent long-term memory in the database.
- Deleting playlists, clearing user data, or other high-impact destructive actions.
- Voice control.
- Streaming AI responses.
- Building a separate music knowledge base.

## Current Problem

The current `/api/chat` flow is too shallow:

1. It sends the latest message and history to DeepSeek.
2. It asks for `{ keywords, reply }`.
3. It searches with those keywords.
4. It returns `reply + tracks`.

This works for direct queries, but fails for follow-ups. For example:

- User: "夏天相关的"
- Assistant: returns summer songs.
- User: "换几首"
- Current behavior: searches for "换几首".
- Desired behavior: refreshes summer songs while excluding the last batch.

The missing pieces are explicit intent classification, context merge, action output, result exclusion, and optional ranking.

## Architecture

Add an Agent Core layer under `src/lib/agent/`:

- `types.ts`: shared request, context, intent, action, and response types.
- `intent.ts`: parse the user message into a structured music intent.
- `context.ts`: merge the parsed intent with the previous agent context.
- `search.ts`: generate search queries, search multiple batches, deduplicate, and exclude previous results.
- `rank.ts`: optionally ask DeepSeek to rank search results for complex requests.
- `handler.ts`: orchestrate the full agent flow and return a structured response.

The API route `src/app/api/chat/route.ts` should become thin:

```ts
const result = await handleMusicAgent({
  message,
  history,
  context,
  userId,
})
return NextResponse.json(result)
```

## Agent Context

The frontend owns current-session context and sends it with every chat request. This avoids a database migration in the first version while still enabling multi-turn intelligence.

Context shape:

```ts
interface AgentContext {
  topic?: string
  scene?: string
  mood?: string[]
  genres?: string[]
  artists?: string[]
  language?: 'zh' | 'en' | 'mixed' | 'unknown'
  era?: string
  energy?: 'low' | 'medium' | 'high' | 'unknown'
  lastQuery?: string
  lastSearchQueries?: string[]
  lastResults: Track[]
  excludedTrackIds: string[]
  feedback: string[]
}
```

Rules:

- `lastResults` is the current AI result list visible in the chat.
- `excludedTrackIds` accumulates songs already recommended in this chat.
- Follow-up intents must reuse the previous context unless the user clearly starts a new topic.
- Feedback such as "不要这么伤感" updates the context constraints.

## Intent Model

Intent categories:

```ts
type AgentIntent =
  | 'new_recommendation'
  | 'refresh_recommendations'
  | 'adjust_recommendations'
  | 'similar_to_track'
  | 'play_track'
  | 'add_to_queue'
  | 'pause'
  | 'resume'
  | 'next_track'
  | 'previous_track'
  | 'unknown'
```

The parser returns:

```ts
interface ParsedIntent {
  intent: AgentIntent
  confidence: number
  replyTone?: 'brief' | 'explanatory'
  query?: string
  topic?: string
  scene?: string
  mood?: string[]
  genres?: string[]
  artists?: string[]
  language?: 'zh' | 'en' | 'mixed' | 'unknown'
  era?: string
  energy?: 'low' | 'medium' | 'high' | 'unknown'
  referencedTrackIndex?: number
  count?: number
  needsDeepRank: boolean
}
```

Simple deterministic parsing should handle common control phrases before calling DeepSeek:

- "换几首", "再来几首", "下一批" -> `refresh_recommendations`
- "播放第二首", "放第 2 首" -> `play_track` with `referencedTrackIndex = 1`
- "类似第一首" -> `similar_to_track` with `referencedTrackIndex = 0`
- "加入队列", "加入播放列表" -> `add_to_queue`
- "暂停", "继续", "下一首", "上一首" -> direct player control intents

DeepSeek is used when deterministic parsing is insufficient.

## Search Strategy

For recommendation intents:

1. Build a merged context from the previous context and parsed intent.
2. Generate 1-5 search queries.
3. Search using the existing `searchTracks` function.
4. Merge results.
5. Remove duplicate track IDs.
6. Remove `excludedTrackIds`.
7. Return 8-10 tracks.

Example for "夏天相关的":

- `夏天 中文流行`
- `夏日 清爽 华语歌`
- `海边 青春 夏天 歌曲`

Example for "换几首" after a summer request:

- Reuse the summer context.
- Generate adjacent summer queries.
- Exclude previously returned tracks.

## Ranking Strategy

Use a mixed strategy:

- Fast path: direct artist, song, genre, or short theme requests.
- Deep path: multi-constraint requests or adjustment requests.

Deep path examples:

- "适合凌晨开车的冷感电子，别太吵"
- "中文女声，夏天，别太网红，节奏轻一点"
- "不要这么伤感，换成明亮一点的"

Deep ranking receives a compact candidate list and returns ordered track IDs plus short reasons. If ranking fails, fall back to search order.

## API Response

The chat endpoint should return structured actions:

```ts
interface AgentResponse {
  reply: string
  intent: AgentIntent
  tracks: Track[]
  actions: AgentAction[]
  context: AgentContext
  debug?: {
    searchQueries?: string[]
    ranked?: boolean
    fallback?: string
  }
}
```

Actions:

```ts
type AgentAction =
  | { type: 'replace_results'; tracks: Track[] }
  | { type: 'play_track'; track: Track }
  | { type: 'append_queue'; tracks: Track[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next_track' }
  | { type: 'previous_track' }
```

The frontend executes actions directly.

## Frontend Behavior

Update `AgentChatPanel` to keep:

- `agentContext`
- `currentResults`
- normal chat messages

Request body:

```ts
{
  message,
  history,
  context: agentContext,
}
```

On response:

- Save `response.context` as the new `agentContext`.
- Render `response.reply`.
- Render `response.tracks` when present.
- Execute each `response.actions`:
  - `replace_results`: update chat result list and player store searched tracks.
  - `play_track`: call `play(track, currentResults)`.
  - `append_queue`: call `addToQueue` for each track.
  - `pause`, `resume`, `next_track`, `previous_track`: call player store actions.

## Example Flows

### Refresh Recommendations

User:

```text
夏天相关的
```

Assistant:

```text
给你找了一组夏天氛围的中文歌，偏清爽和明亮。
```

User:

```text
换几首
```

Assistant:

```text
继续给你换一批夏天氛围的歌，这次避开刚才那几首。
```

Expected behavior:

- Intent is `refresh_recommendations`.
- Previous summer context is reused.
- Previous result IDs are excluded.
- The reply does not mention "关于「换几首」".

### Play Referenced Track

User:

```text
播放第二首
```

Expected behavior:

- Intent is `play_track`.
- The second track from current results plays immediately.
- No new search is performed.

### Similar Recommendation

User:

```text
类似第一首
```

Expected behavior:

- Intent is `similar_to_track`.
- The first current result becomes the seed.
- New results are returned and previous results are excluded.

## Error Handling

- If a referenced track index is out of range, reply with a short correction and do not execute playback.
- If search returns no results, relax constraints once and retry.
- If DeepSeek fails, fall back to deterministic parsing and normal search.
- If all sources fail, return a friendly failure message without changing context.
- If a track has no playable URL, keep existing music-service filtering behavior.

## Verification

Manual scenarios:

- "夏天相关的" then "换几首" returns a new summer batch.
- "播放第二首" plays the second visible result and does not search.
- "类似第一首" returns similar songs based on the first result.
- "不要这么伤感" adjusts the current context and refreshes results.
- "加入队列" appends current results.
- A direct query like "周杰伦" remains fast.

Code checks:

- Run focused TypeScript or build check.
- Run focused lint on changed files.
- Verify the UI still fits inside the single AURA MUSIC screen.
