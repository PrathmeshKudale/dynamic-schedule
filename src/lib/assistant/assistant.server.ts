// Assistant module — server-only answer generation (AI with deterministic fallback).
import { aiText } from "../ai.server";
import { schedule, type SBlock, type SEvent, type SProfile, type STask } from "../scheduler";
import { DAY, WEEKDAYS, fmtDuration, localDayStart, localDow } from "../time";

type Sched = { tasks: STask[]; events: SEvent[]; blocks: SBlock[]; profile: SProfile };
type Msg = { role: "user" | "assistant"; content: string };

function hm(ms: number, tz: number) {
  const d = new Date(ms - tz * 60000);
  const h = d.getUTCHours();
  return `${((h + 11) % 12) + 1}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function dayLabel(ms: number, now: number, tz: number) {
  const diff = Math.round((localDayStart(ms, tz) - localDayStart(now, tz)) / DAY);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : WEEKDAYS[localDow(ms, tz)];
}

function agenda(s: Sched, now: number, tz: number, days = 4) {
  const titles = new Map(s.tasks.map((t) => [t.id, t.title]));
  const end = localDayStart(now, tz) + days * DAY;
  const items = [
    ...s.events.filter((e) => e.end > now && e.start < end).map((e) => ({ start: e.start, end: e.end, title: e.title, kind: e.isProtected ? "protected event" : "fixed event" })),
    ...s.blocks.filter((b) => b.end > now && b.start < end).map((b) => ({ start: b.start, end: b.end, title: titles.get(b.taskId) ?? "Task", kind: "planned work" })),
  ].sort((a, b) => a.start - b.start);
  return items;
}

function context(s: Sched, now: number, tz: number) {
  const items = agenda(s, now, tz).map((i) => `${dayLabel(i.start, now, tz)} ${hm(i.start, tz)}–${hm(i.end, tz)}: ${i.title} (${i.kind})`);
  const tasks = s.tasks
    .filter((t) => !t.isCompleted)
    .map((t) => `${t.title} — ${t.priority}, ${fmtDuration(t.estimatedMinutes)}, ${t.deadline ? `due ${dayLabel(t.deadline, now, tz)} ${hm(t.deadline, tz)}` : "no deadline"}`);
  const sim = schedule({ ...s, now, tz, mode: "optimize" });
  return [
    `Now: ${dayLabel(now, now, tz)} ${hm(now, tz)}. Wake ${s.profile.wake}, sleep ${s.profile.sleep}, focus sessions ${s.profile.focus}m.`,
    `Workload next 7 days: required ${fmtDuration(sim.workload.requiredMinutes)}, available ${fmtDuration(sim.workload.availableMinutes)}, unplaced ${fmtDuration(sim.workload.unplacedMinutes)}.`,
    `Agenda:\n${items.join("\n") || "(empty)"}`,
    `Open tasks:\n${tasks.join("\n") || "(none)"}`,
  ].join("\n\n");
}

function freeSlots(s: Sched, now: number, tz: number, dayStart: number, minMinutes: number) {
  const items = agenda(s, now, tz, 8).filter((i) => i.end > dayStart && i.start < dayStart + DAY);
  const [wh, wm] = s.profile.wake.split(":").map(Number);
  const [sh, sm] = s.profile.sleep.split(":").map(Number);
  let cursor = Math.max(now, dayStart + ((wh ?? 7) * 60 + (wm ?? 0)) * 60000);
  const stop = dayStart + ((sh ?? 23) * 60 + (sm ?? 0)) * 60000;
  const out: { start: number; end: number }[] = [];
  for (const i of items) {
    if (i.start - cursor >= minMinutes * 60000) out.push({ start: cursor, end: i.start });
    cursor = Math.max(cursor, i.end);
  }
  if (stop - cursor >= minMinutes * 60000) out.push({ start: cursor, end: stop });
  return out;
}

export function fallbackAnswer(s: Sched, q: string, now: number, tz: number): string {
  const text = q.toLowerCase();
  const items = agenda(s, now, tz, 2);
  const today = localDayStart(now, tz);
  if (/right now|now\b|next|should i do/.test(text)) {
    const cur = items.find((i) => i.start <= now && i.end > now);
    const nxt = items.find((i) => i.start > now);
    return [
      cur ? `**Right now:** ${cur.title} (until ${hm(cur.end, tz)}).` : "Nothing is scheduled right now — it's free time.",
      nxt ? `**Next:** ${nxt.title} at ${hm(nxt.start, tz)} (${dayLabel(nxt.start, now, tz)}).` : "Nothing else is planned in the next two days.",
    ].join("\n\n");
  }
  if (/gym|workout|exercise|fit/.test(text)) {
    const slot = freeSlots(s, now, tz, today, 60)[0];
    return slot
      ? `Yes — you have a free window **${hm(slot.start, tz)}–${hm(slot.end, tz)}** today, long enough for a 60-minute gym session.`
      : "Today doesn't have a free 60-minute window left. Tomorrow would be a better fit.";
  }
  if (/weekend|saturday|sunday/.test(text)) {
    const lines: string[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = today + d * DAY;
      const dow = localDow(ds, tz);
      if (dow !== 0 && dow !== 6) continue;
      const slots = freeSlots(s, now, tz, ds, 60);
      lines.push(`**${WEEKDAYS[dow]}:** ${slots.length ? slots.map((x) => `${hm(x.start, tz)}–${hm(x.end, tz)}`).join(", ") + " free" : "fully booked"}`);
    }
    return `Here's your weekend availability:\n\n${lines.join("\n")}`;
  }
  const sim = schedule({ ...s, now, tz, mode: "optimize" });
  if (/enough time|finish|fit everything|overload/.test(text)) {
    return sim.workload.unplacedMinutes > 0
      ? `Not quite. You need **${fmtDuration(sim.workload.requiredMinutes)}** of work but only **${fmtDuration(sim.workload.availableMinutes)}** is free this week — about **${fmtDuration(sim.workload.unplacedMinutes)}** won't fit. Consider moving a flexible task or extending a deadline.`
      : `Yes. You need **${fmtDuration(sim.workload.requiredMinutes)}** of work and have **${fmtDuration(sim.workload.availableMinutes)}** free this week.`;
  }
  const match = s.tasks.find((t) => !t.isCompleted && text.includes(t.title.toLowerCase().split(" ")[0] ?? "~"));
  if (match) {
    const b = s.blocks.filter((x) => x.taskId === match.id && x.end > now).sort((a, c) => a.start - c.start)[0];
    return b
      ? `**${match.title}** is next planned for ${dayLabel(b.start, now, tz)} at ${hm(b.start, tz)}–${hm(b.end, tz)}.`
      : `**${match.title}** isn't scheduled yet. Try **Optimize** on the Overview page to find it a slot.`;
  }
  const nxt = items.find((i) => i.start > now);
  return `I can answer questions about your schedule — what's next, whether something fits today, your weekend, or whether you have enough time.${nxt ? `\n\nYour next item is **${nxt.title}** at ${hm(nxt.start, tz)}.` : ""}`;
}

export async function answer(s: Sched, messages: Msg[], now: number, tz: number): Promise<{ text: string; provider: "openai" | "demo" }> {
  const last = messages[messages.length - 1]!.content;
  try {
    const transcript = messages.map((m) => `${m.role === "user" ? "Student" : "TimeOS"}: ${m.content}`).join("\n");
    const text = await aiText(
      `You are TimeOS, a personal time assistant for a student. Answer ONLY from the schedule data below; never invent events, times or tasks. If asked to change the schedule, explain what you'd suggest and tell them to use Optimize, "My day changed" or What-If to apply it — you cannot edit the schedule yourself. Protect sleep, meals and social time. Be concise (under 120 words), use short markdown.\n\nSCHEDULE DATA\n${context(s, now, tz)}`,
      transcript,
    );
    return { text, provider: "openai" };
  } catch (e) {
    console.error("Assistant fell back to demo provider:", e instanceof Error ? e.message : e);
    return { text: fallbackAnswer(s, last, now, tz), provider: "demo" };
  }
}
