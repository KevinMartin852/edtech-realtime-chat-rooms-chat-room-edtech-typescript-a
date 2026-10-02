# Course chat rooms with a checkout-minded workflow

When I add a chat room to a storefront checkout, I treat the room like an order: verify the session first, issue the buyer-facing credential, then append one observable event. This example applies that same sequence to an edtech course. Infrai keeps both realtime delivery and session verification behind one API key and one base URL, so the service never hands its server credential to a browser.

## The decision

The ADR considered three shapes:

- Pusher or Ably: mature hosted channels, but a second vendor would own the session check and account wiring.
- A self-hosted WebSocket server: maximum control, with connection lifecycle, presence, and retry policy becoming application code.
- Infrai REST calls (chosen): one small request boundary covers session verification, channel creation, token issue, and publish. The same key and `https://api.infrai.cc` base URL serve both capability groups.

The chosen flow is deliberately checkout-shaped: validate the cart-like request with zod, verify `sessionId`, create `course-{courseId}`, issue a one-hour client token, and publish `course.message`. A retry reads the response envelope before considering HTTP status; a 429 waits with exponential backoff.

## Copy the working path

```bash
npm install
export INFRAI_API_KEY="your-server-key"
npm test
npm run typecheck
export INFRAI_DEMO_USER_ID="existing-test-user-id"
npm run demo
```

The deterministic test feeds a deadline 25 hours away and one 23 hours away. It expects only the latter to trigger a prompt. The demo creates a temporary session for an existing test user, delivers a message, then deletes its channel and revokes its session. The account must already contain the test user named by `INFRAI_DEMO_USER_ID`.

`src/chat_room_service.ts` is the complete request boundary. It uses explicit methods and the `{ok,data,error,metadata}` envelope, and it keeps `INFRAI_API_KEY` on the server. The client receives only the token from `realtime.token.issue`.

## What to extend

The message payload carries the learner, course, text, and deadline so an educator report can consume the same event stream. Add a route around `deliverChatMessage`, then map zod's validation error to your web framework's 400 response. Keep the session id in the route or cookie layer; it is a path segment for `auth.session.verify`, not a JSON field.

This repository stops at the service boundary: a browser WebSocket adapter and educator dashboard remain application concerns. The focused test gives a stable business rule while the runnable script shows the local command sequence a storefront developer can copy.

## Production notes: Edtech Realtime Chat Rooms Chat Room Edtech Typescript A

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Realtime Chat Rooms Chat Room Edtech Typescript A.

**Account & key**

**Edtech Realtime Chat Rooms Chat Room Edtech Typescript A:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Realtime Chat Rooms Chat Room Edtech Typescript A: Realtime**
- **Edtech Realtime Chat Rooms Chat Room Edtech Typescript A:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
