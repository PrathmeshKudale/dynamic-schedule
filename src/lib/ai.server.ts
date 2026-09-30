// Server-only AI provider layer. OpenAI (via Lovable AI Gateway) with a deterministic DemoAIProvider fallback.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ParsedSchema, demoParse, validateParsed, type Parsed } from "./parse";
import { DAY, WEEKDAYS, localDateStr, localDayStart, localDow, fmtDuration } from "./time";
import type { Proposal } from "./scheduler";

export type ProviderName = "openai" | "demo";

async function aiText(system: string, prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI key not configured");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    prompt,
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (!text.trim()) throw new Error("Empty AI response");
  return text;
}

const PARSE_SYSTEM = `You convert a student's natural-language note into structured schedule data.
Return ONLY JSON: {"events":[{"title","date":"YYYY-MM-DD","start":"HH:mm","end":"HH:mm","category","isProtected"}],"tasks":[{"title","estimatedMinutes","deadlineDate":"YYYY-MM-DD"|null,"priority","category","energy"}]}
categories: ACADEMIC LEARNING HEALTH SOCIAL PERSONAL PROJECT TRAVEL OTHER. priority: LOW MEDIUM HIGH URGENT. energy: LOW MEDIUM HIGH (coding/maths/assignments=HIGH, reading/revision=MEDIUM).
Events have a fixed time. Tasks are work needing time (no fixed time). If an event has only a start time, assume 60 minutes. Use 24h times. Keep titles short (e.g. "College Festival", "DBMS Assignment"). Mark gym/friends/family as isProtected=true.`;

export async function parseText(text: string, now: number, tz: number): Promise<{ parsed: Parsed; provider: ProviderName }> {
  const base = localDayStart(now, tz);
  const days = Array.from({ length: 8 }, (_, i) => {
    const ds = base + i * DAY;
    return `${i === 0 ? "today" : i === 1 ? "tomorrow" : ""} ${WEEKDAYS[localDow(ds, tz)]} = ${localDateStr(ds, tz)}`.trim();
  }).join("\n");
  try {
    const raw = await aiText(PARSE_SYSTEM, `Calendar reference:\n${days}\n\nNote: """${text.slice(0, 1000)}"""`);
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = validateParsed(ParsedSchema.parse(JSON.parse(json)));
    if (!parsed.events.length && !parsed.tasks.length) throw new Error("Nothing parsed");
    return { parsed, provider: "openai" };
  } catch (e) {
    console.error("AI parse fell back to demo provider:", e instanceof Error ? e.message : e);
    return { parsed: demoParse(text, now, tz), provider: "demo" };
  }
}

function tfmt(ms: number, tz: number) {
  const d = new Date(ms - tz * 60000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const day = WEEKDAYS[d.getUTCDay()].slice(0, 3);
  return `${day} ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const REASON_TEXT: Record<string, string> = {
  deadline: "its deadline is close",
  "high-energy-period": "it lands in a high-energy window, suited to demanding work",
  "energy-match": "the time of day matches the effort it needs",
  availability: "there's no fixed event, sleep or protected time in that slot",
  "session-length": "it fits your preferred focus-session length",
};

export function templateExplanation(p: Proposal, tz: number, trigger?: string | null): string {
  const lines: string[] = [];
  if (trigger) lines.push(`You told me: "${trigger}".`);
  if (!p.moved.length && !p.added.length) lines.push("Your current plan already respects every constraint, so nothing needed to move.");
  for (const m of p.moved.slice(0, 4)) {
    const why = m.reasons.map((r) => REASON_TEXT[r]).filter(Boolean).join(", ");
    lines.push(`**${m.title}** moved from ${tfmt(m.from.start, tz)} to ${tfmt(m.to.start, tz)} — ${m.cause.toLowerCase()}. The new slot works because ${why}.`);
  }
  for (const a of p.added.slice(0, 3)) {
    const why = a.reasons.map((r) => REASON_TEXT[r]).filter(Boolean).join(", ");
    lines.push(`**${a.title}** was placed at ${tfmt(a.start, tz)} because ${why}.`);
  }
  if (p.keptCount) lines.push(`${p.keptCount} other blocks were left exactly where they were.`);
  lines.push(`Protected and untouched: ${p.protectedItems.join(", ")}.`);
  if (p.warnings.length) lines.push(`Heads up: ${p.warnings[0]}`);
  return lines.join("\n\n");
}

export async function explainProposal(p: Proposal, tz: number, trigger?: string | null): Promise<{ text: string; provider: ProviderName }> {
  const compact = {
    trigger,
    moved: p.moved.slice(0, 8).map((m) => ({ task: m.title, from: tfmt(m.from.start, tz), to: tfmt(m.to.start, tz), cause: m.cause, reasons: m.reasons })),
    added: p.added.slice(0, 8).map((a) => ({ task: a.title, at: tfmt(a.start, tz), reasons: a.reasons })),
    keptUnchanged: p.keptCount,
    protected: p.protectedItems,
    warnings: p.warnings,
    workload: { required: fmtDuration(p.workload.requiredMinutes), available: fmtDuration(p.workload.availableMinutes) },
  };
  try {
    const text = await aiText(
      "You are TimeOS, an adaptive scheduler. Explain the schedule change to the student in under 130 words using ONLY the structured data given. Use short markdown: one intro line, then bullets per moved/added task (bold task name, why this time, what caused it), then one line on what was protected. Never invent events, times or scientific claims. Warm, direct, no fluff.",
      JSON.stringify(compact),
    );
    return { text, provider: "openai" };
  } catch (e) {
    console.error("AI explain fell back to demo provider:", e instanceof Error ? e.message : e);
    return { text: templateExplanation(p, tz, trigger), provider: "demo" };
  }
}
