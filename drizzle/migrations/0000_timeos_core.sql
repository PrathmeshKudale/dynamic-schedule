CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT 'Alex',
  course text,
  year text,
  wake_time text NOT NULL DEFAULT '07:00',
  sleep_time text NOT NULL DEFAULT '23:00',
  focus_minutes int NOT NULL DEFAULT 45,
  break_minutes int NOT NULL DEFAULT 10,
  demo_loaded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'OTHER',
  priority text NOT NULL DEFAULT 'MEDIUM',
  estimated_minutes int NOT NULL DEFAULT 60,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'TODO',
  is_flexible boolean NOT NULL DEFAULT true,
  is_completed boolean NOT NULL DEFAULT false,
  energy_requirement text NOT NULL DEFAULT 'MEDIUM',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_user_idx ON public.tasks(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  category text NOT NULL DEFAULT 'OTHER',
  source text NOT NULL DEFAULT 'MANUAL',
  is_fixed boolean NOT NULL DEFAULT true,
  is_protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_user_time_idx ON public.events(user_id, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blocks_user_time_idx ON public.schedule_blocks(user_id, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks" ON public.schedule_blocks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.schedule_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  trigger_text text,
  proposal jsonb NOT NULL,
  narrative text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX changes_user_idx ON public.schedule_changes(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_changes TO authenticated;
GRANT ALL ON public.schedule_changes TO service_role;
ALTER TABLE public.schedule_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own changes" ON public.schedule_changes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);