import { strict as assert } from "node:assert";
import { shouldSendDeadlinePrompt } from "./chat_room_service.ts";

const now = new Date("2026-09-12T10:00:00.000Z");
assert.equal(shouldSendDeadlinePrompt(new Date("2026-09-13T09:00:00.000Z"), now), true);
assert.equal(shouldSendDeadlinePrompt(new Date("2026-09-14T10:00:00.000Z"), now), false);
console.log("deadline prompt decision: pass");
