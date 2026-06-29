export const DIMENSIONS = [
  { key: "visual", label: "Visual", color: "var(--color-dim-visual)", hex: "#2D7DD2",
    blurb: "You make sense of ideas through images, diagrams and color." },
  { key: "kinesthetic", label: "Kinesthetic", color: "var(--color-dim-kinesthetic)", hex: "#D2552F",
    blurb: "You learn by doing — building, moving, experimenting." },
  { key: "auditory", label: "Auditory", color: "var(--color-dim-auditory)", hex: "#F2C200",
    blurb: "You absorb ideas through listening, talking it out and rhythm." },
  { key: "read_write", label: "Read / Write", color: "var(--color-dim-readwrite)", hex: "#1FA98C",
    blurb: "You think clearest with notes, lists and written explanations." },
  { key: "social", label: "Social", color: "var(--color-dim-social)", hex: "#E8568F",
    blurb: "You learn fastest in a group — bouncing ideas, teaching others." },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export type DimensionScores = Record<DimensionKey, number>;

export const EMPTY_SCORES: DimensionScores = {
  visual: 0, kinesthetic: 0, auditory: 0, read_write: 0, social: 0,
};

export const STUDY_TIPS: Record<DimensionKey, string[]> = {
  visual: ["Sketch concepts as mind-maps or flowcharts.", "Color-code your notes by theme."],
  kinesthetic: ["Build a small prototype of the idea.", "Take a walk while reciting key points."],
  auditory: ["Record yourself explaining a topic, then replay it.", "Join or start a study podcast."],
  read_write: ["Rewrite lecture notes in your own words.", "Summarize each chapter in 5 bullets."],
  social: ["Form a 3-person study trio.", "Teach the topic to a friend — even a pretend one."],
};
