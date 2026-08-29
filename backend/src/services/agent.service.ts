import dotenv from "dotenv";
dotenv.config();

import { Agent } from "@mastra/core/agent";
import { createAgentMemory } from "../config/memory.js";
import { getAgentInstructions } from "../config/agent-instructions.js";
import { createCalendarTools } from "./agent-tools.service.js";


export type AgentEvent = {
  type: "started" | "progress" | "token" | "completed" | "error";
  message?: string;
  token?: string;
};

export type StreamAgentReplyInput = {
  userId: string;
  authUserId: string;
  threadId: string;
  message: string;
  onEvent: (event: AgentEvent) => void;
};

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

function modelName() {
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (geminiKey) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = geminiKey;
    process.env.GEMINI_API_KEY = geminiKey;
    process.env.GOOGLE_API_KEY = geminiKey;
    return `google/${process.env.AI_MODEL ?? "gemini-3.6-flash"}`;
  }

  return `openai/${process.env.AI_MODEL ?? "gpt-4o-mini"}`;
}



function messageText(content: unknown): string {
  // 1) Already a string
  if (typeof content === "string") return content.trim();

  // 2) Null/undefined/primitive
  if (!content || typeof content !== "object") return "";

  // 3) Array of content parts (AI SDK CoreMessage format)
  //    e.g. [{ type: "text", text: "Hello" }, { type: "tool-call", ... }]
  if (Array.isArray(content)) {
    const textParts: string[] = [];
    for (const part of content) {
      if (typeof part === "string") {
        textParts.push(part.trim());
      } else if (part && typeof part === "object") {
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string" && p.text.trim()) {
          textParts.push(p.text.trim());
        } else if (typeof p.content === "string" && p.content.trim()) {
          textParts.push(p.content.trim());
        }
      }
    }
    return textParts.filter(Boolean).join("\n").trim();
  }

  // 4) Object with common text properties
  const record = content as Record<string, unknown>;

  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim();
  }

  if (typeof record.content === "string" && record.content.trim()) {
    return record.content.trim();
  }

  // 5) Object with nested content array
  if (Array.isArray(record.content)) {
    return messageText(record.content);
  }

  // 6) Object with parts array
  if (Array.isArray(record.parts)) {
    return messageText(record.parts);
  }

  // 7) Last resort: try to stringify but only if it produces useful output
  try {
    const str = JSON.stringify(content);
    // Don't return raw JSON objects to the user — skip them
    if (str && str !== "{}" && str !== "[]") {
      return "";
    }
  } catch {}

  return "";
}

export async function listUserThreads(
  authUserId: string,
): Promise<ThreadSummary[]> {
  const memory = createAgentMemory();

  const result = await memory.listThreads({
    filter: { resourceId: authUserId },
    perPage: 30,
    orderBy: { field: "updatedAt", direction: "DESC" },
  });

  return result.threads.map((thread) => ({
    id: thread.id,
    title: thread.title?.trim() || "Untitled Chat",
    updatedAt:
      thread.updatedAt instanceof Date
        ? thread.updatedAt.toISOString()
        : String(thread.updatedAt),
  }));
}

export async function getThreadMessages(
  authUserId: string,
  threadId: string,
): Promise<ThreadMessage[]> {
  const memory = createAgentMemory();

  const thread = await memory.getThreadById({
    threadId,
    resourceId: authUserId,
  });

  if (!thread || thread.resourceId !== authUserId) {
    throw new Error("Thread not found");
  }

  const recalledMemoryData = await memory.recall({
    threadId,
    resourceId: authUserId,
    perPage: false,
  });

  const messages: ThreadMessage[] = [];

  for (const message of recalledMemoryData.messages) {
    // === DIAGNOSTIC: log raw message content shape ===
    try {
      const rawType = typeof message.content;
      const isArr = Array.isArray(message.content);
      console.log(`[THREAD MSG] role=${message.role} contentType=${rawType} isArray=${isArr} raw=${JSON.stringify(message.content).slice(0, 300)}`);
    } catch {}

    const content = messageText(message.content);

    if (!content) {
      continue;
    }

    const role: ThreadMessage["role"] =
      message.role === "user" || message.role === "assistant"
        ? message.role
        : "system";

    messages.push({
      id: message.id,
      role,
      content,
    });
  }

  return messages;
}


function extractChunkText(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const c = chunk as Record<string, unknown>;
  const payload = c.payload as Record<string, unknown> | string | undefined;

  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.text === "string") return payload.text;
    if (typeof payload.textDelta === "string") return payload.textDelta;
    if (typeof payload.delta === "string") return payload.delta;
  }

  if (typeof c.text === "string") return c.text;
  if (typeof c.textDelta === "string") return c.textDelta;
  if (typeof c.delta === "string") return c.delta;

  return "";
}

export async function streamAgentReply(input: StreamAgentReplyInput) {
  const hasGemini = Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY,
  );
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasGemini && !hasOpenAI) {
    throw new Error(
      "Neither GOOGLE_GEMINI_API_KEY nor OPENAI_API_KEY is set in environment.",
    );
  }

  input.onEvent({
    type: "started",
    message: "Agent is planning",
  });

  const memory = createAgentMemory();

  const selectedModel = modelName();
  console.log(`[AGENT EXECUTE] Starting stream with model: ${selectedModel} for user: ${input.authUserId}`);

  const agent = new Agent({
    id: "metting-assistant",
    name: "Meeting Assitant",
    instructions: getAgentInstructions(),
    model: selectedModel,
    tools: createCalendarTools(input.authUserId),
    memory,
  });

  const result = await agent.stream(input.message, {
    memory: {
      resource: input.authUserId,
      thread: input.threadId,
    },
  });

  try {
    let chunkIndex = 0;
    for await (const chunk of result.fullStream) {
      // === DIAGNOSTIC: log every chunk to find [object Object] source ===
      try {
        console.log(`[STREAM CHUNK #${chunkIndex}] type=${(chunk as any).type} raw=${JSON.stringify(chunk).slice(0, 500)}`);
      } catch { 
        console.log(`[STREAM CHUNK #${chunkIndex}] type=${(chunk as any).type} (not serializable)`);
      }
      chunkIndex++;

      if (chunk.type === "tool-call") {
        const toolName =
          (chunk as { payload?: { toolName?: string } })?.payload?.toolName ||
          (chunk as { toolName?: string })?.toolName ||
          "calendar tool";

        input.onEvent({
          type: "progress",
          message: `Running ${toolName}`,
        });
        continue;
      }

      if (chunk.type === "text-delta") {
        const text = extractChunkText(chunk);
        console.log(`[STREAM TEXT-DELTA] extracted="${text}"`);

        if (text) {
          input.onEvent({
            type: "token",
            token: text,
          });
        }
        continue;
      }

      if (chunk.type === "error") {
        console.error("[STREAM CHUNK ERROR]:", JSON.stringify(chunk));
        const errObj = (chunk as { error?: unknown; payload?: unknown });
        const errMsg =
          (errObj.error instanceof Error ? errObj.error.message : String(errObj.error || errObj.payload || "Model error"));
        input.onEvent({
          type: "error",
          message: errMsg,
        });
        continue;
      }

      // Catch-all: any other chunk type that might contain text
      const fallbackText = extractChunkText(chunk);
      if (fallbackText) {
        console.log(`[STREAM FALLBACK type=${(chunk as any).type}] extracted="${fallbackText}"`);
        input.onEvent({
          type: "token",
          token: fallbackText,
        });
      }
    }
  } catch (streamErr) {
    console.error("[STREAM ITERATION ERROR]:", streamErr);
    throw streamErr;
  }



  // streaming finsihes

  const thread = await memory.getThreadById({
    threadId: input.threadId,
    resourceId: input.authUserId,
  });

  if (thread && !thread.title?.trim()) {
    await memory.updateThread({
      id: thread.id,
      title: input.message.slice(0, 80),
      metadata: thread.metadata ?? {},
    });
  }

  input.onEvent({
    type: "completed",
    message: "done",
  });
}
