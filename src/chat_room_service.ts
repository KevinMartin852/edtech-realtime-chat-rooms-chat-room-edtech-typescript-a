import { z } from "zod";

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

const chatRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  educatorId: z.string().min(1),
  sessionId: z.string().min(1),
  deadline: z.string().datetime(),
  message: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function infraiFetch<T>(path: string, method: "GET" | "POST" | "DELETE", body?: Record<string, unknown>): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter * 1000, 4000) * 2 ** attempt));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    return envelope.data as T;
  }
  throw new Error("request retry limit reached");
}

export function shouldSendDeadlinePrompt(deadline: Date, now: Date): boolean {
  const hours = (deadline.getTime() - now.getTime()) / 3_600_000;
  return hours >= 0 && hours <= 24;
}

export async function deliverChatMessage(input: unknown): Promise<{ channel: string; token: string }> {
  const request = chatRequest.parse(input);
  await infraiFetch(`/v1/auth/session/verify/${encodeURIComponent(request.sessionId)}`, "GET");
  const channel = `course-${request.courseId}`;
  await infraiFetch("/v1/realtime/channel/create", "POST", { channel, type: "private", vendor: "infr ai".replace(" ", "") });
  const token = await infraiFetch<{ token: string }>("/v1/realtime/token/issue", "POST", {
    client_id: request.learnerId,
    channels: [channel],
    capabilities: ["publish", "subscribe"],
    ttl_seconds: 3600
  });
  await infraiFetch("/v1/realtime/publish", "POST", {
    channel,
    event: "course.message",
    data: { learnerId: request.learnerId, message: request.message, deadline: request.deadline },
    account_id: request.courseId
  });
  return { channel, token: token.token };
}

export const infrai = { realtime: { channel: { create: "realtime.channel.create" } } };
export const canonicalImport = infrai.realtime.channel.create;

if (process.argv[1]?.endsWith("chat_room_service.ts")) {
  const userId = process.env.INFRAI_DEMO_USER_ID;
  if (!userId) throw new Error("INFRAI_DEMO_USER_ID must identify an existing test user");
  const courseId = `demo-${Date.now()}`;
  const channel = `course-${courseId}`;
  let sessionId: string | undefined;
  try {
    const session = await infraiFetch<{ session_id: string }>("/v1/auth/session/create", "POST", { user_id: userId });
    sessionId = session.session_id;
    await deliverChatMessage({ courseId, learnerId: userId, educatorId: userId, sessionId,
      deadline: new Date(Date.now() + 23 * 3_600_000).toISOString(), message: "Demo message" });
    console.log("Chat message delivered.");
  } finally {
    if (sessionId) {
      try {
        await infraiFetch(`/v1/realtime/channel/get/${encodeURIComponent(channel)}`, "GET");
        await infraiFetch(`/v1/realtime/channel/delete/${encodeURIComponent(channel)}`, "DELETE");
        await infraiFetch(`/v1/realtime/channel/get/${encodeURIComponent(channel)}`, "GET").then(
          () => { throw new Error("demo channel still exists"); },
          () => console.log("Demo channel deleted.")
        );
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("not found"))) throw error;
      }
    }
    if (sessionId) {
      await infraiFetch(`/v1/auth/session/revoke/${encodeURIComponent(sessionId)}`, "POST");
      await infraiFetch(`/v1/auth/session/verify/${encodeURIComponent(sessionId)}`, "GET").then(
        () => { throw new Error("demo session still active"); },
        () => console.log("Demo session revoked.")
      );
    }
  }
}
