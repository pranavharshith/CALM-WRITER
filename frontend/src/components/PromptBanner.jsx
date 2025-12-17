import React from 'react';
const PROMPTS = [
  'Write something you never said out loud.',
  'Describe a turning point in your life.',
  'What did you once believe for sure?',
  'When did you feel most human?',
  'Write about a moment of honesty.'
];
export default function PromptBanner() {
  const prompt = PROMPTS[(new Date().getDate()) % PROMPTS.length];
  return <div style={{marginBottom:24,fontSize:'1.11em',opacity:.72}}>{prompt}</div>;
}

