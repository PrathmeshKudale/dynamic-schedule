CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'LEARNING',
  target_date timestamptz,
  estimated_hours int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX goals_user_idx ON public.goals(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX goal_milestones_goal_idx ON public.goal_milestones(goal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_milestones TO authenticated;
GRANT ALL ON public.goal_milestones TO service_role;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own milestones" ON public.goal_milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.attendance_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  attended int NOT NULL DEFAULT 0 CHECK (attended >= 0),
  total int NOT NULL DEFAULT 0 CHECK (total >= 0),
  target int NOT NULL DEFAULT 75 CHECK (target BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (attended <= total)
);
CREATE INDEX attendance_user_idx ON public.attendance_subjects(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_subjects TO authenticated;
GRANT ALL ON public.attendance_subjects TO service_role;
ALTER TABLE public.attendance_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attendance" ON public.attendance_subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);