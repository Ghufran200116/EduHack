export interface FeedbackOption { key: string; label: string }
export interface FeedbackQuestion { key: string; prompt: string; type?: "choice" | "text"; options: FeedbackOption[] }

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  {
    key: "pace",
    prompt: "How is the pace of this course feeling?",
    options: [
      { key: "too_slow", label: "A bit slow" },
      { key: "just_right", label: "Just right" },
      { key: "too_fast", label: "Too fast" },
    ],
  },
  {
    key: "materials",
    prompt: "Which kind of material helps you most right now?",
    options: [
      { key: "more_visuals", label: "More diagrams / visuals" },
      { key: "more_handson", label: "More hands-on exercises" },
      { key: "more_discussion", label: "More discussion / talk-throughs" },
      { key: "more_notes", label: "More written summaries" },
      { key: "more_group", label: "More group work" },
    ],
  },
  {
    key: "clarity",
    prompt: "How clear are the explanations in class?",
    options: [
      { key: "very_clear", label: "Very clear" },
      { key: "mostly_clear", label: "Mostly clear" },
      { key: "often_lost", label: "I often get lost" },
    ],
  },
  {
    key: "support",
    prompt: "What support would help you most?",
    options: [
      { key: "office_hours", label: "Office hours / 1-on-1 time" },
      { key: "recordings", label: "Recordings to replay" },
      { key: "study_group", label: "An official study group" },
      { key: "examples", label: "More worked examples" },
    ],
  },
  {
    key: "workload",
    prompt: "How is the workload for this course?",
    options: [
      { key: "too_light", label: "Too light" },
      { key: "just_right", label: "Just right" },
      { key: "too_heavy", label: "Too heavy" },
    ],
  },
  {
    key: "engagement",
    prompt: "How engaging are the class sessions?",
    options: [
      { key: "very_engaging", label: "Very engaging" },
      { key: "somewhat_engaging", label: "Somewhat engaging" },
      { key: "disengaged", label: "I tend to zone out" },
    ],
  },
  {
    key: "assessments",
    prompt: "How fair do assessments (quizzes/assignments) feel?",
    options: [
      { key: "very_fair", label: "Very fair" },
      { key: "mostly_fair", label: "Mostly fair" },
      { key: "often_unfair", label: "Often feel unfair" },
    ],
  },
  {
    key: "open_feedback",
    prompt: "Anything else you'd like to share?",
    type: "text",
    options: [],
  },
];
