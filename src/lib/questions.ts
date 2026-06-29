import type { DimensionKey } from "./dimensions";

export interface Choice {
  label: string;
  weights: Partial<Record<DimensionKey, number>>;
}

export interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
  allowText?: boolean;
}

export const QUESTIONS: Question[] = [
  { id: "q1", prompt: "When you're trying to understand a new topic, what helps most?", choices: [
    { label: "A diagram or video", weights: { visual: 3 } },
    { label: "Trying it hands-on", weights: { kinesthetic: 3 } },
    { label: "Listening to someone explain it", weights: { auditory: 3 } },
    { label: "Reading about it", weights: { read_write: 3 } },
  ]},
  { id: "q2", prompt: "You've got 30 minutes to study. You usually…", choices: [
    { label: "Rewrite my notes", weights: { read_write: 3 } },
    { label: "Re-watch the lecture", weights: { visual: 2, auditory: 1 } },
    { label: "Talk through it with a friend", weights: { social: 2, auditory: 1 } },
    { label: "Do practice problems", weights: { kinesthetic: 3 } },
  ]},
  { id: "q3", prompt: "Group projects make you feel…", choices: [
    { label: "Energised — I think out loud", weights: { social: 3 } },
    { label: "Useful, as long as we split tasks", weights: { social: 1, read_write: 1 } },
    { label: "I'd rather work solo", weights: { read_write: 2 } },
    { label: "Fine, especially if we build something", weights: { kinesthetic: 2, social: 1 } },
  ]},
  { id: "q4", prompt: "When directions are given verbally, you…", choices: [
    { label: "Remember them easily", weights: { auditory: 3 } },
    { label: "Need to write them down", weights: { read_write: 3 } },
    { label: "Ask to see a map or sketch", weights: { visual: 3 } },
    { label: "Just start moving and figure it out", weights: { kinesthetic: 3 } },
  ]},
  { id: "q5", prompt: "What's your favourite kind of class?", choices: [
    { label: "Lab or workshop", weights: { kinesthetic: 3 } },
    { label: "Discussion-based seminar", weights: { social: 2, auditory: 1 } },
    { label: "Lecture with great slides", weights: { visual: 2, auditory: 1 } },
    { label: "Reading-and-essay course", weights: { read_write: 3 } },
  ]},
  { id: "q6", prompt: "When you remember something well, it's usually because…", choices: [
    { label: "I pictured it", weights: { visual: 3 } },
    { label: "I said it out loud", weights: { auditory: 3 } },
    { label: "I wrote it down", weights: { read_write: 3 } },
    { label: "I did it myself", weights: { kinesthetic: 3 } },
  ]},
  { id: "q7", prompt: "If a topic feels stuck, you'd most likely…", choices: [
    { label: "Find a YouTube explainer", weights: { visual: 2, auditory: 1 } },
    { label: "Ask a classmate", weights: { social: 3 } },
    { label: "Try a worked example", weights: { kinesthetic: 2, read_write: 1 } },
    { label: "Re-read the chapter", weights: { read_write: 3 } },
  ]},
  { id: "q8", prompt: "Pick your dream study spot:", choices: [
    { label: "A quiet library nook", weights: { read_write: 2 } },
    { label: "A café with friends", weights: { social: 3 } },
    { label: "A maker-space or lab", weights: { kinesthetic: 3 } },
    { label: "A bright room with whiteboards", weights: { visual: 3 } },
  ]},
  { id: "q9", prompt: "How do you take notes?", choices: [
    { label: "Sketches, arrows, color", weights: { visual: 3 } },
    { label: "Bullet lists and full sentences", weights: { read_write: 3 } },
    { label: "Voice memos", weights: { auditory: 3 } },
    { label: "Barely — I just do the thing", weights: { kinesthetic: 2 } },
  ]},
  { id: "q10", prompt: "Which feels most rewarding?", choices: [
    { label: "Explaining an idea to someone else", weights: { social: 2, auditory: 1 } },
    { label: "Finishing a clean set of notes", weights: { read_write: 3 } },
    { label: "Watching something I built work", weights: { kinesthetic: 3 } },
    { label: "A perfectly-organised mind-map", weights: { visual: 3 } },
  ]},
  { id: "q11", prompt: "Podcasts and audiobooks?", choices: [
    { label: "Love them, listen daily", weights: { auditory: 3 } },
    { label: "Now and then", weights: { auditory: 1 } },
    { label: "Prefer to read instead", weights: { read_write: 2 } },
    { label: "I zone out without visuals", weights: { visual: 2 } },
  ]},
  { id: "q12", prompt: "Last one — what motivates you most while learning?", choices: [
    { label: "Seeing my progress visually", weights: { visual: 2 } },
    { label: "Sharing wins with people", weights: { social: 3 } },
    { label: "Making something tangible", weights: { kinesthetic: 3 } },
    { label: "Mastering the material on paper", weights: { read_write: 3 } },
  ], allowText: true },
];
