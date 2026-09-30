export const CAT_LABEL: Record<string, string> = {
  ACADEMIC: "Academic",
  LEARNING: "Learning",
  HEALTH: "Health",
  SOCIAL: "Social",
  PERSONAL: "Personal",
  PROJECT: "Project",
  TRAVEL: "Travel",
  OTHER: "Other",
};

/** Tailwind classes per category using semantic tokens. */
export const CAT_STYLE: Record<string, { dot: string; solid: string; soft: string; text: string; border: string }> = {
  ACADEMIC: { dot: "bg-cat-academic", solid: "bg-cat-academic/15", soft: "bg-cat-academic/8", text: "text-cat-academic", border: "border-cat-academic" },
  LEARNING: { dot: "bg-cat-learning", solid: "bg-cat-learning/15", soft: "bg-cat-learning/8", text: "text-cat-learning", border: "border-cat-learning" },
  HEALTH: { dot: "bg-cat-health", solid: "bg-cat-health/15", soft: "bg-cat-health/8", text: "text-cat-health", border: "border-cat-health" },
  SOCIAL: { dot: "bg-cat-social", solid: "bg-cat-social/15", soft: "bg-cat-social/8", text: "text-cat-social", border: "border-cat-social" },
  PERSONAL: { dot: "bg-cat-personal", solid: "bg-cat-personal/15", soft: "bg-cat-personal/8", text: "text-cat-personal", border: "border-cat-personal" },
  PROJECT: { dot: "bg-cat-project", solid: "bg-cat-project/15", soft: "bg-cat-project/8", text: "text-cat-project", border: "border-cat-project" },
  TRAVEL: { dot: "bg-cat-travel", solid: "bg-cat-travel/15", soft: "bg-cat-travel/8", text: "text-cat-travel", border: "border-cat-travel" },
  OTHER: { dot: "bg-cat-other", solid: "bg-cat-other/15", soft: "bg-cat-other/8", text: "text-cat-other", border: "border-cat-other" },
};
export const catStyle = (c: string) => CAT_STYLE[c] ?? CAT_STYLE["OTHER"]!;

export const REASON_LABEL: Record<string, string> = {
  deadline: "Deadline soon",
  "high-energy-period": "High-energy window",
  "energy-match": "Energy match",
  availability: "Free slot",
  "session-length": "Fits focus session",
};
