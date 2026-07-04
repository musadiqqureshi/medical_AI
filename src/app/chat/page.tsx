"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { assistants, type Assistant } from "@/lib/assistants";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { Orb } from "@/components/Orb";
import {
  PaperclipIcon,
  MicIcon,
  SendIcon,
  StopIcon,
  CloseIcon,
  FileIcon,
  LogoutIcon,
} from "@/components/icons";

type Attachment = {
  kind: "image" | "file";
  name: string;
  dataUrl?: string;
  text?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const TEXT_FILE_RE = /\.(txt|md|markdown|csv|json|log)$/i;

export default function ChatPage() {
  const router = useRouter();
  const { loading: authLoading, session, configured } = useSession();

  const [activeId, setActiveId] = useState<string>("medical");
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const active = assistants.find((a) => a.id === activeId) as Assistant;
  const messages = threads[activeId] || [];
  const canSend = input.trim().length > 0 || pending.length > 0;

  // Gate: if Supabase is configured and there's no session, go to /login.
  useEffect(() => {
    if (!authLoading && configured && !session) router.replace("/login");
  }, [authLoading, configured, session, router]);

  useEffect(() => {
    setVoiceSupported(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    );
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function setMessages(updater: (prev: Message[]) => Message[]) {
    setThreads((t) => ({ ...t, [activeId]: updater(t[activeId] || []) }));
  }

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/");
  }

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
        setError(
          `"${file.name}" can't be read directly. For PDFs or scans, upload a photo/screenshot instead.`,
        );
      }
    }
    if (next.length) setPending((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePending(i: number) {
    setPending((p) => p.filter((_, idx) => idx !== i));
  }

  // ---- Voice input -------------------------------------------------------
  function toggleVoice() {
    if (!voiceSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

    const userMsg: Message = { role: "user", content, attachments };
    const history = [...messages, userMsg];
    setMessages(() => history);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setLoading(true);

    const wire = history.map((m) => ({ role: m.role, content: toWireContent(m) }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: activeId, messages: wire }),
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
          nextArr[nextArr.length - 1] = { role: "assistant", content: acc };
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

  // Avoid flashing chat before the auth redirect resolves.
  if (configured && !session && !authLoading) return null;

  const userName =
    (session?.user?.user_metadata?.full_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="flex h-[100dvh] p-0 md:gap-4 md:p-4">
      {/* Sidebar */}
      <aside className="glass hidden w-72 shrink-0 flex-col rounded-3xl p-4 md:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-1">
          <div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-lg shadow-lg">
            🩺
          </div>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-slate-800">Medical AI</h1>
            <p className="text-[11px] text-slate-500">Care navigation suite</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {assistants.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                a.id === activeId
                  ? "glass-strong text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <span className="text-lg">{a.emoji}</span>
              <span className="flex-1 text-[13px] font-medium leading-tight">{a.name}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-1 pt-4">
          {configured && session && (
            <div className="flex items-center justify-between rounded-2xl bg-white/50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-700">{userName}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {session.user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white/70"
              >
                <LogoutIcon />
              </button>
            </div>
          )}
          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            Educational tool. Not a substitute for professional medical advice.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="glass flex min-w-0 flex-1 flex-col overflow-hidden rounded-none md:rounded-3xl">
        {/* Header */}
        <header className="glass-strong flex items-center gap-3 border-b border-white/40 px-4 py-3 md:px-5 md:py-4">
          <div
            className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${active.accent} text-xl text-white shadow-lg`}
          >
            {active.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-slate-800">{active.name}</h2>
            <p className="truncate text-xs text-slate-500">{active.tagline}</p>
          </div>
          {/* Mobile: assistant switcher + sign out */}
          <div className="flex items-center gap-2 md:hidden">
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="max-w-[8rem] rounded-xl border border-white/60 bg-white/60 px-2 py-1.5 text-xs text-slate-700"
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
            {configured && session && (
              <button
                onClick={signOut}
                title="Sign out"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-white/70"
              >
                <LogoutIcon />
              </button>
            )}
          </div>
        </header>

        <div className="bg-amber-400/15 px-5 py-2 text-center text-[11px] font-medium text-amber-700">
          {active.disclaimer}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 && (
              <div className="mt-4 flex flex-col items-center text-center">
                <div className="animate-float mb-5">
                  <Orb size={104} />
                </div>
                <p className="mb-1 text-lg font-semibold text-slate-800">
                  Hi {userName}, how can I help today?
                </p>
                <p className="mb-6 text-sm text-slate-500">
                  Describe symptoms, upload a lab report photo, or use the mic.
                </p>
                <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {active.starters.map((s) => (
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

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? `bg-gradient-to-br ${active.accent} text-white`
                      : "glass-strong text-slate-800"
                  }`}
                >
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {m.attachments.map((att, ai) =>
                        att.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={ai}
                            src={att.dataUrl}
                            alt={att.name}
                            className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/40"
                          />
                        ) : (
                          <span
                            key={ai}
                            className="inline-flex items-center gap-1 rounded-lg bg-black/10 px-2 py-1 text-xs"
                          >
                            <FileIcon className="h-3.5 w-3.5" /> {att.name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  {m.content ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : loading && i === messages.length - 1 ? (
                    <Dots />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-1 max-w-3xl px-4 text-center text-xs text-red-500">{error}</div>
        )}

        {/* Composer */}
        <div className="px-3 pb-3 pt-2 md:px-4 md:pb-4">
          {pending.length > 0 && (
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2 px-1">
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
                    aria-label="Remove attachment"
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
            className="glass-strong mx-auto flex max-w-3xl items-center gap-1 rounded-[1.75rem] p-1.5 pl-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.txt,.md,.csv,.json,.log"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <button
              type="button"
              title="Attach image or file"
              onClick={() => fileRef.current?.click()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-violet-600"
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
              placeholder={listening ? "Listening…" : "Describe your symptoms…"}
              className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />

            {/* One primary circular button: Send when there's input, else Mic (voice). */}
            {canSend ? (
              <button
                type="submit"
                disabled={loading}
                className="brand-gradient grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-md shadow-violet-500/30 transition active:scale-95 disabled:opacity-50"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            ) : voiceSupported ? (
              <button
                type="button"
                onClick={toggleVoice}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-md transition active:scale-95 ${
                  listening ? "animate-pulse bg-red-500 shadow-red-500/30" : "brand-gradient shadow-violet-500/30"
                }`}
                aria-label={listening ? "Stop listening" : "Voice input"}
              >
                {listening ? <StopIcon /> : <MicIcon />}
              </button>
            ) : (
              <button
                type="submit"
                disabled
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-300 text-white"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            )}
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
            AI can make mistakes and does not provide diagnosis. Verify important information with a clinician.
          </p>
        </div>
      </main>
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
