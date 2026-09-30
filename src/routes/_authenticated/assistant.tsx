import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tz } from "@/hooks/use-timeos";
import { askTimeOS } from "@/lib/assistant/assistant.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Ask TimeOS — your schedule assistant" },
      { name: "description", content: "Ask questions about your real schedule: what's next, what fits, and whether you have enough time." },
      { property: "og:title", content: "Ask TimeOS" },
      { property: "og:description", content: "A time assistant grounded in your actual schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string; provider?: string };
const SUGGESTIONS = ["What should I do right now?", "Can I fit gym today?", "Do I have enough time to finish everything?", "Plan my weekend."];

function AssistantPage() {
  const fn = useServerFn(askTimeOS);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const ask = useMutation({
    mutationFn: (history: Msg[]) => fn({ data: { tz: tz(), messages: history.map(({ role, content }) => ({ role, content })) } }),
    onSuccess: (r) => setMsgs((m) => [...m, { role: "assistant", content: r.text, provider: r.provider }]),
  });
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, ask.isPending]);

  function send(text: string) {
    const t = text.trim();
    if (!t || ask.isPending) return;
    const next = [...msgs, { role: "user" as const, content: t }].slice(-20);
    setMsgs(next);
    setInput("");
    ask.mutate(next);
  }

  return (
    <AppShell title="Ask TimeOS">
      <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-3xl flex-col">
        <div className="flex-1 space-y-6 pb-6">
          {msgs.length === 0 && (
            <div className="grid place-items-center pt-10 text-center animate-rise">
              <Logo compact />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">What do you want to know about your time?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Answers come from your actual schedule, tasks and deadlines.</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="surface px-4 py-3 text-left text-sm transition hover:border-primary/50">{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start gap-3")}>
              {m.role === "assistant" && <div className="mt-0.5 shrink-0"><Logo compact /></div>}
              {m.role === "user" ? (
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">{m.content}</p>
              ) : (
                <div className="max-w-[85%]">
                  <div className="prose-chat text-sm leading-relaxed"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  {m.provider === "demo" && <p className="mt-1 text-[11px] text-muted-foreground">Answered by the built-in demo engine</p>}
                </div>
              )}
            </div>
          ))}
          {ask.isPending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading your schedule…</p>}
          {ask.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              TimeOS AI is temporarily unavailable. Your schedule is safe.{" "}
              <button className="font-medium underline" onClick={() => ask.mutate(msgs)}>Retry</button>
            </div>
          )}
          <div ref={end} />
        </div>
        <form
          className="surface sticky bottom-20 flex items-end gap-2 p-2 md:bottom-4"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          <Textarea
            aria-label="Ask TimeOS"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about your schedule…"
            className="min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || ask.isPending} className="shrink-0 rounded-xl"><ArrowUp className="h-4 w-4" /></Button>
        </form>
      </div>
    </AppShell>
  );
}
