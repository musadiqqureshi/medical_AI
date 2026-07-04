"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssistant, type Assistant } from "@/lib/assistants";
import { useSession } from "@/lib/useSession";
import { Orb } from "@/components/Orb";
import { VoiceMessage } from "@/components/VoiceMessage";
import {
  PaperclipIcon,
  MicIcon,
  SendIcon,
  StopIcon,
  CloseIcon,
  FileIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  SparkleIcon,
} from "@/components/icons";

type Attachment = { kind: "image" | "file"; name: string; dataUrl?: string; text?: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  time: string;
};
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const TEXT_FILE_RE = /\.(txt|md|markdown|csv|json|log)$/i;
const now = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();

export default function ChatPage() {
  const router = useRouter();
  const { loading: authLoading, session, configured } = useSession();
  const assistant = getAssistant("medical") as Assistant;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const canSend = input.trim().length > 0 || pending.length > 0;

  useEffect(() => {
    if (!authLoading && configured && !session) router.replace("/login");
  }, [authLoading, configured, session, router]);

  useEffect(() => {
    setVoiceSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    // Prefill from a Home category/history tap (?ask=...)
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (ask) setInput(ask);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // ---- Attachments -------------------------------------------------------
  async function onFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 8 * 1024 * 1024) {
        setError(`"${file.name}" is larger than 8 MB and was skipped.`);
        continue;
      }
      if (file.type.startsWith("image/")) {
        next.push({ kind: "image", name: file.name, dataUrl: await readAsDataUrl(file) });
      } else if (TEXT_FILE_RE.test(file.name) || file.type.startsWith("text/")) {
        next.push({ kind: "file", name: file.name, text: await readAsText(file) });
      } else {
        setError(`"${file.name}" can't be read. Upload a photo/screenshot instead.`);
      }
    }
    if (next.length) setPending((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  const removePending = (i: number) => setPending((p) => p.filter((_, idx) => idx !== i));

  // ---- Voice-to-text input ----------------------------------------------
  function toggleVoice() {
    if (!voiceSupported) return;
    if (listening) return recognitionRef.current?.stop();
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  // ---- Send --------------------------------------------------------------
  async function send(text: string, attachments: Attachment[] = pending) {
    const content = text.trim();
    if ((!content && attachments.length === 0) || loading) return;
    setError(null);
    setInput("");
    setPending([]);
    if (listening) recognitionRef.current?.stop();

    const history = [...messages, { role: "user" as const, content, attachments, time: now() }];
    setMessages([...history, { role: "assistant", content: "", time: now() }]);
    setLoading(true);

    const wire = history.map((m) => ({ role: m.role, content: toWireContent(m) }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: assistant.id, messages: wire }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const nextArr = [...prev];
          nextArr[nextArr.length - 1] = { ...nextArr[nextArr.length - 1], content: acc };
          return nextArr;
        });
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.content === "")));
    } finally {
      setLoading(false);
    }
  }

  if (configured && !session && !authLoading) return null;

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pb-3 pt-6">
        <button
          onClick={() => router.push("/home")}
          className="glass grid h-10 w-10 place-items-center rounded-full text-slate-600"
          aria-label="Back"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-slate-900">Medical AI</h1>
        <button className="glass grid h-10 w-10 place-items-center rounded-full text-amber-500" aria-label="Saved">
          <BookmarkIcon />
        </button>
      </header>

      <div className="px-5 pb-1 text-center text-[10px] font-medium text-amber-600">
        {assistant.disclaimer}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="animate-float mb-5">
              <Orb size={112} />
            </div>
            <p className="mb-1 text-lg font-semibold text-slate-800">How can I help today?</p>
            <p className="mb-6 text-sm text-slate-500">
              Describe symptoms, upload a lab report, or tap the mic.
            </p>
            <div className="grid w-full gap-2">
              {assistant.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s, [])}
                  className="glass rounded-2xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white/70"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={i} m={m} />
            ) : (
              <AssistantBubble key={i} m={m} loading={loading && i === messages.length - 1} />
            ),
          )}
        </div>
      </div>

      {error && <div className="px-5 pb-1 text-center text-xs text-red-500">{error}</div>}

      {/* Composer */}
      <div className="px-4 pb-6 pt-2">
        {pending.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pending.map((att, i) => (
              <div key={i} className="glass relative rounded-xl p-1">
                {att.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.dataUrl} alt={att.name} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-14 items-center gap-1 px-2 text-xs text-slate-600">
                    <FileIcon /> {att.name}
                  </span>
                )}
                <button
                  onClick={() => removePending(i)}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-white"
                  aria-label="Remove"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.log"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />

          <div className="glass-strong flex flex-1 items-center gap-2 rounded-full px-3 py-1.5">
            <button
              type="button"
              title="Attach"
              onClick={() => fileRef.current?.click()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:text-violet-600"
            >
              <PaperclipIcon />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={listening ? "Listening…" : "Message…"}
              className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="flex shrink-0 items-center gap-1 pr-1 text-sm font-semibold text-violet-600">
              <SparkleIcon className="h-4 w-4" /> 24
            </span>
          </div>

          {/* Circular mic / send button (mockup style) */}
          {canSend ? (
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg shadow-violet-500/30 transition active:scale-95 disabled:opacity-50"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleVoice}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg transition active:scale-95 ${
                listening ? "animate-pulse bg-red-500 shadow-red-500/30" : "brand-gradient shadow-violet-500/30"
              }`}
              aria-label={listening ? "Stop" : "Voice"}
            >
              {listening ? <StopIcon /> : <MicIcon />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// --- message bubbles ------------------------------------------------------

function UserBubble({ m }: { m: Message }) {
  return (
    <div className="flex flex-col items-end">
      {m.attachments && m.attachments.length > 0 && (
        <div className="mb-1.5 flex flex-wrap justify-end gap-2">
          {m.attachments.map((att, ai) =>
            att.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={ai} src={att.dataUrl} alt={att.name} className="h-24 w-24 rounded-2xl object-cover" />
            ) : (
              <span key={ai} className="glass inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600">
                <FileIcon className="h-3.5 w-3.5" /> {att.name}
              </span>
            ),
          )}
        </div>
      )}
      {m.content && (
        <div className="max-w-[82%] rounded-3xl rounded-tr-md bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800 shadow-sm">
          <span className="whitespace-pre-wrap">{m.content}</span>
        </div>
      )}
      <span className="mt-1 pr-1 text-[10px] text-slate-400">{m.time}</span>
    </div>
  );
}

function AssistantBubble({ m, loading }: { m: Message; loading: boolean }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 shrink-0">
        <Orb size={34} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">AI Assistant</span>
          <span className="text-[10px] text-slate-400">{m.time}</span>
        </div>
        <div className="max-w-[92%] rounded-3xl rounded-tl-md bg-violet-50/80 px-4 py-3 text-[14px] leading-relaxed text-slate-800 shadow-sm">
          {m.content ? (
            <span className="whitespace-pre-wrap">{m.content}</span>
          ) : loading ? (
            <Dots />
          ) : null}
        </div>
        {m.content && !loading && (
          <div className="mt-2 max-w-[92%]">
            <VoiceMessage text={m.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- helpers --------------------------------------------------------------

function toWireContent(m: Message): string | ContentPart[] {
  const atts = m.attachments || [];
  const images = atts.filter((a) => a.kind === "image" && a.dataUrl);
  const fileTexts = atts.filter((a) => a.kind === "file" && a.text);
  if (images.length === 0 && fileTexts.length === 0) return m.content;
  const parts: ContentPart[] = [];
  let text = m.content;
  for (const f of fileTexts) text += `\n\n[Attached file: ${f.name}]\n${f.text}`;
  parts.push({ type: "text", text: text || "Please review the attached." });
  for (const img of images) parts.push({ type: "image_url", image_url: { url: img.dataUrl as string } });
  return parts;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).slice(0, 20000));
    r.onerror = reject;
    r.readAsText(file);
  });
}

function Dots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300" />
    </span>
  );
}
