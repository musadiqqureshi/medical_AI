import { NextRequest } from "next/server";
import { getAssistant, detectRedFlags } from "@/lib/assistants";

export const runtime = "nodejs";

// A content part matches the OpenAI-compatible multimodal format.
type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextPart | ImagePart;

type ClientMessage = {
  role: "user" | "assistant";
  content: string | ContentPart[];
};

export async function POST(req: NextRequest) {
  const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.LLM_MODEL || "anthropic/claude-sonnet-4.6";

  let body: { assistantId?: string; messages?: ClientMessage[]; accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const assistant = getAssistant(body.assistantId || "");
  if (!assistant) return json({ error: "Unknown assistant." }, 400);

  const messages = (body.messages || []).filter(
    (m) => m.role === "user" || m.role === "assistant",
  );
  if (messages.length === 0) return json({ error: "No messages provided." }, 400);

  // ---- Safety layer: intercept emergency red-flags before anything else,
  // so this works even if the model provider isn't configured yet.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const flags = detectRedFlags(assistant, extractText(lastUser.content));
    if (flags.length > 0) {
      const notice =
        assistant.id === "medical"
          ? "⚠️ **This may be a medical emergency.** Based on what you described, please **call your local emergency number (e.g. 911 / 112 / 999) or go to the nearest emergency department right now.** If you are having thoughts of harming yourself, please contact a crisis line immediately — in the US call or text **988**. I'm an information tool and can't help in an emergency, but real help is available right now."
          : "⚠️ **Please be careful.** What you described could be serious. Stop any activity and seek appropriate professional or emergency help right away rather than relying on this tool.";
      return streamStaticText(notice);
    }
  }

  // ---- Credits: spend one credit for a signed-in user (skipped in dev when
  // Supabase isn't configured or the user isn't authenticated).
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supaUrl && supaKey && body.accessToken) {
    try {
      const r = await fetch(`${supaUrl}/rest/v1/rpc/deduct_credit`, {
        method: "POST",
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${body.accessToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (r.ok) {
        const remaining = Number(await r.text());
        if (remaining < 0) {
          return json({ error: "You're out of credits.", code: "no_credits" }, 402);
        }
      }
      // If the RPC isn't set up yet (non-OK), fail open so chat still works.
    } catch {
      // Network issue reaching Supabase — fail open rather than block chat.
    }
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return json(
      { error: "Server is missing LLM_API_KEY. Copy .env.local.example to .env.local and add your key." },
      500,
    );
  }

  const payloadMessages = [
    { role: "system", content: assistant.systemPrompt },
    ...messages,
  ];

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.LLM_SITE_URL || "http://localhost:3005",
        "X-Title": process.env.LLM_SITE_NAME || "Medical AI Assistant",
      },
      body: JSON.stringify({
        model,
        messages: payloadMessages,
        stream: true,
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });
  } catch (e: any) {
    return json({ error: `Could not reach model provider: ${e?.message || e}` }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json(
      { error: `Model provider error (${upstream.status}). ${detail.slice(0, 300)}` },
      502,
    );
  }

  // Transform the provider's SSE stream into a plain text token stream.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the last, possibly-incomplete line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) controller.enqueue(encoder.encode(token));
        } catch {
          // Ignore keep-alive / partial lines.
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

/** Pulls plain text out of a message whose content may be a multimodal array. */
function extractText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Streams a fixed string back using the same text-stream contract as the model. */
function streamStaticText(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
