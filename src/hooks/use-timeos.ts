import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getState } from "@/lib/timeos.functions";

export const tz = () => new Date().getTimezoneOffset();

export type TimeState = Awaited<ReturnType<typeof getState>>;
export type TaskRow = TimeState["tasks"][number];
export type EventRow = TimeState["events"][number];
export type BlockRow = TimeState["blocks"][number];

export function useTimeOS() {
  const fn = useServerFn(getState);
  return useQuery({ queryKey: ["timeos"], queryFn: () => fn({ data: { tz: tz() } }), staleTime: 10_000 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAction<I, O>(serverFn: (args: { data: I }) => Promise<O>, opts?: { success?: string; error?: string; onSuccess?: (o: O) => void }) {
  const fn = useServerFn(serverFn as never) as unknown as (args: { data: I }) => Promise<O>;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: I) => fn({ data }),
    onSuccess: async (o) => {
      await qc.invalidateQueries({ queryKey: ["timeos"] });
      if (opts?.success) toast.success(opts.success);
      opts?.onSuccess?.(o);
    },
    onError: (e: Error) => {
      toast.error(opts?.error ?? "We couldn't save your change.", { description: e.message.slice(0, 160) });
    },
  });
}

export interface Item {
  id: string;
  title: string;
  start: number;
  end: number;
  category: string;
  kind: "event" | "block";
  isProtected?: boolean;
  taskId?: string;
  done?: boolean;
  highlight?: "moved" | "added";
  raw?: EventRow;
}

export function buildItems(
  state: TimeState,
  opts?: { blocksOverride?: { taskId: string; start: number; end: number }[]; highlights?: Map<string, "moved" | "added"> },
): Item[] {
  const taskMap = new Map(state.tasks.map((t) => [t.id, t]));
  const items: Item[] = state.events.map((e) => ({
    id: e.id,
    title: e.title,
    start: Date.parse(e.start_time),
    end: Date.parse(e.end_time),
    category: e.category,
    kind: "event",
    isProtected: e.is_protected,
    raw: e,
  }));
  const blocks = opts?.blocksOverride
    ? opts.blocksOverride
    : state.blocks.map((b) => ({ taskId: b.task_id, start: Date.parse(b.start_time), end: Date.parse(b.end_time) }));
  for (const b of blocks) {
    const t = taskMap.get(b.taskId);
    if (!t) continue;
    const key = `${b.taskId}|${b.start}`;
    items.push({
      id: `b-${key}`,
      title: t.title,
      start: b.start,
      end: b.end,
      category: t.category,
      kind: "block",
      taskId: t.id,
      done: t.is_completed,
      highlight: opts?.highlights?.get(key),
    });
  }
  return items.sort((a, b) => a.start - b.start);
}
