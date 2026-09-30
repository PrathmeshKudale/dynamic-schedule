import { z } from "zod";
import { DAY, WEEKDAYS, localDateStr, localDayStart, localDow, localMinutes, nextDow } from "./time";

const HM = z.string().regex(/^\d{1,2}:\d{2}$/);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const CATEGORIES = ["ACADEMIC", "LEARNING", "HEALTH", "SOCIAL", "PERSONAL", "PROJECT", "TRAVEL", "OTHER"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const ParsedSchema = z.object({
  events: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        date: DATE,
        start: HM,
        end: HM,
        category: z.enum(CATEGORIES).catch("OTHER"),
        isProtected: z.boolean().catch(false),
      }),
    )
    .catch([]),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        estimatedMinutes: z.number().int().min(15).max(1200),
        deadlineDate: DATE.nullable().catch(null),
        priority: z.enum(PRIORITIES).catch("MEDIUM"),
        category: z.enum(CATEGORIES).catch("OTHER"),
        energy: z.enum(["LOW", "MEDIUM", "HIGH"]).catch("MEDIUM"),
      }),
    )
    .catch([]),
});
export type Parsed = z.infer<typeof ParsedSchema>;

/** Business-rule validation after schema validation. */
export function validateParsed(p: Parsed): Parsed {
  return {
    events: p.events.filter((e) => e.end > e.start || e.end === "00:00"),
    tasks: p.tasks,
  };
}

// ---------- Deterministic demo parser (DemoAIProvider) ----------
function to24(h: number, m: number, ap?: string, hintPm = false) {
  let hh = h;
  const a = ap?.toLowerCase();
  if (a === "pm" && hh < 12) hh += 12;
  if (a === "am" && hh === 12) hh = 0;
  if (!a && hintPm && hh < 8) hh += 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayFrom(text: string, now: number, tz: number) {
  const t = text.toLowerCase();
  if (/\btomorrow\b/.test(t)) return localDayStart(now, tz) + DAY;
  if (/\btoday|tonight\b/.test(t)) return localDayStart(now, tz);
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i].toLowerCase()}\\b`).test(t)) {
      return localDow(now, tz) === i && /\btoday\b/.test(t) ? localDayStart(now, tz) : nextDow(now, tz, i, 1);
    }
  }
  return null;
}

function eventMeta(s: string): { title: string; category: (typeof CATEGORIES)[number]; isProtected: boolean } {
  const t = s.toLowerCase();
  if (t.includes("festival")) return { title: "College Festival", category: "SOCIAL", isProtected: false };
  if (t.includes("lecture")) return { title: t.includes("extra") ? "Extra Lecture" : "Lecture", category: "ACADEMIC", isProtected: false };
  if (t.includes("exam")) return { title: "Exam", category: "ACADEMIC", isProtected: false };
  if (t.includes("college")) return { title: "College", category: "ACADEMIC", isProtected: false };
  if (t.includes("gym")) return { title: "Gym", category: "HEALTH", isProtected: true };
  if (t.includes("friend")) return { title: "Friends", category: "SOCIAL", isProtected: true };
  if (t.includes("trip") || t.includes("travel")) return { title: "Trip", category: "TRAVEL", isProtected: false };
  if (t.includes("meeting")) return { title: "Meeting", category: "PERSONAL", isProtected: false };
  if (t.includes("doctor") || t.includes("appointment")) return { title: "Appointment", category: "PERSONAL", isProtected: false };
  const m = s.match(/(?:have|got|attend)\s+(?:an?\s+|the\s+)?([a-z][a-z ]{2,30}?)\s+(?:on|at|from|tomorrow|today|this|next)/i);
  return { title: m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : "Event", category: "OTHER", isProtected: false };
}

export function demoParse(text: string, now: number, tz: number): Parsed {
  const out: Parsed = { events: [], tasks: [] };
  const clauses = text.split(/(?<=[.;!?\n])|,\s*(?=(?:and\s+)?(?:i\s|need|want|also|then))|\band also\b|\bthen\b/i).map((c) => c.trim()).filter(Boolean);
  const globalDay = dayFrom(text, now, tz);
  for (const c of clauses) {
    const day = dayFrom(c, now, tz) ?? globalDay ?? localDayStart(now, tz);
    const range = c.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|–|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    const at = c.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    const dur = c.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b/i);
    const isTask = /\b(assignment|homework|study|prepare|preparation|practice|revise|revision|finish|complete|work on)\b/i.test(c) || (dur && /\bfor\b/i.test(c));
    if (range && !isTask) {
      const ap2 = range[6];
      const ap1 = range[3] ?? ap2;
      const start = to24(+range[1], +(range[2] ?? 0), ap1, true);
      const end = to24(+range[4], +(range[5] ?? 0), ap2 ?? ap1, true);
      out.events.push({ ...eventMeta(c), date: localDateStr(day, tz), start, end });
      continue;
    }
    if (at && !isTask) {
      const start = to24(+at[1], +(at[2] ?? 0), at[3], true);
      const [h, m] = start.split(":").map(Number);
      const mins = dur ? Math.round(parseFloat(dur[1]) * (/h/i.test(dur[2]) ? 60 : 1)) : 60;
      const endMin = Math.min(23 * 60 + 59, h * 60 + m + mins);
      const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      out.events.push({ ...eventMeta(c), date: localDateStr(day, tz), start, end });
      continue;
    }
    if (isTask) {
      const d2 = dur ?? text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b/i);
      const mins = d2 ? Math.round(parseFloat(d2[1]) * (/^h/i.test(d2[2]) ? 60 : 1)) : 90;
      let title = "";
      const forM = c.match(/\bfor\s+(?:my\s+|the\s+)?([a-z0-9][a-z0-9 +#]{1,40}?)(?:\s+(?:assignment|by|due|before|tomorrow|today|on)\b|[,.]|$)/i);
      const subj = c.match(/\b([A-Z][A-Za-z0-9+#]{1,15})\s+(assignment|homework|test|exam|project|practice)/);
      if (subj) title = `${subj[1]} ${subj[2][0].toUpperCase()}${subj[2].slice(1).toLowerCase()}`;
      else if (forM) title = forM[1].trim().replace(/\b\w/g, (x) => x.toUpperCase());
      else title = c.replace(/^(i\s+)?(need|have|want)\s+(to\s+)?/i, "").slice(0, 40);
      const due = /\b(due|by|before|deadline)\b/i.test(c) || dayFrom(c, now, tz) != null;
      const deadlineDay = dayFrom(c, now, tz);
      const cat = /react|learn|course/i.test(c) ? "LEARNING" : /gym|run|workout/i.test(c) ? "HEALTH" : /hackathon|project/i.test(c) ? "PROJECT" : "ACADEMIC";
      out.tasks.push({
        title,
        estimatedMinutes: Math.max(15, Math.min(1200, mins)),
        deadlineDate: due && deadlineDay ? localDateStr(deadlineDay, tz) : null,
        priority: deadlineDay && deadlineDay - localDayStart(now, tz) <= DAY ? "HIGH" : "MEDIUM",
        category: cat,
        energy: cat === "ACADEMIC" || cat === "PROJECT" ? "HIGH" : "MEDIUM",
      });
    }
  }
  void localMinutes;
  return validateParsed(out);
}
