import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

/** Query a module's server function (no input). */
export function useModuleQuery<O>(key: string, serverFn: () => Promise<O>) {
  const fn = useServerFn(serverFn as never) as unknown as () => Promise<O>;
  return useQuery({ queryKey: [key], queryFn: () => fn(), staleTime: 10_000 });
}

/** Mutation that refreshes the given module keys plus the core schedule. */
export function useModuleAction<I, O>(
  serverFn: (args: { data: I }) => Promise<O>,
  keys: string[],
  opts?: { success?: string; onSuccess?: (o: O) => void },
) {
  const fn = useServerFn(serverFn as never) as unknown as (args: { data: I }) => Promise<O>;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: I) => fn({ data }),
    onSuccess: async (o) => {
      await Promise.all([...keys, "timeos"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      if (opts?.success) toast.success(opts.success);
      opts?.onSuccess?.(o);
    },
    onError: (e: Error) => toast.error("We couldn't save your change.", { description: e.message.slice(0, 160) }),
  });
}
