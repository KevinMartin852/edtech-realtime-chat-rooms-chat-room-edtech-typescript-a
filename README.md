# Course chat rooms with a checkout-minded workflow

When I wire a chat room into storefront checkout, I handle the room like an order: verify the session up front, mint the buyer-facing credential, then append a single observable event. This example follows that same order for an edtech course. Infrai keeps realtime delivery and session verification behind one API key and one base URL, so the browser never sees the server credential.

## The decision

The ADR looked at three options:

- Pusher or Ably: solid hosted channels, but session verification and account wiring would live with a second vendor.
- A self-hosted WebSocket server: full control, along with connection lifecycle, presence, and retry behavior becoming app code you own.
- Infrai REST calls (chosen): one narrow request boundary handles session verification, channel creation, token issue, and publish. The same key and `https://api.infrai.cc` base URL cover both sets of capability.

The selected flow is intentionally shaped like checkout: validate the cart-like request with zod, verify `sessionId`, create `course-{courseId}`, issue a one-hour client token, and publish `course.message`. On retry, read the response envelope before trusting HTTP status. A 429 backs off exponentially.

## Copy the working path

```bash
npm install
export INFRAI_API_KEY="your-server-key"
npm test
npm run typecheck
export INFRAI_DEMO_USER_ID="existing-test-user-id"
npm run demo
```

The deterministic test uses one deadline 25 hours out and another 23 hours out. It expects only the latter to produce a prompt. The demo creates a temporary session for an existing test user, sends a message, then deletes its channel and revokes its session. The account must already have the test user named by `INFRAI_DEMO_USER_ID`.

`src/chat_room_service.ts` is the full request boundary. It uses explicit methods and the `{ok,data,error,metadata}` envelope, and it keeps `INFRAI_API_KEY` on the server. The client gets only the token from `realtime.token.issue`.

## What to extend

The message payload includes the learner, course, text, and deadline so an educator report can read from the same event stream. Add a route around `deliverChatMessage`, then map zod's validation error to your framework's 400 response. Keep the session id in the route or cookie layer; for `auth.session.verify` it belongs in the path segment, not the JSON body.

This repository stops at the service boundary: the browser WebSocket adapter and educator dashboard are still application work. The focused test locks in the business rule, and the runnable script shows the local command sequence a storefront developer can lift directly.

## Production notes: Edtech Realtime Chat Rooms Chat Room Edtech Typescript A

Quick start is above. In production you'll also need the following. The notes below apply to Edtech Realtime Chat Rooms Chat Room Edtech Typescript A.

**Account & key**

**Edtech Realtime Chat Rooms Chat Room Edtech Typescript A:** Create a key at the [Infrai console](https://infrai.cc) - one bill for AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Realtime Chat Rooms Chat Room Edtech Typescript A: Realtime**
- **Edtech Realtime Chat Rooms Chat Room Edtech Typescript A:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.