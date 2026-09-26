import { STARTER_PROMPTS } from "../../constants/routine";

interface Props {
  disabled?: boolean;
  onSelect: (prompt: string) => void | Promise<void>;
}

export function RoutineChatStarterMarquee({ disabled = false, onSelect }: Props) {
  const loopPrompts = [...STARTER_PROMPTS, ...STARTER_PROMPTS];

  return (
    <div className="routine-chat-starters-marquee" aria-label="추천 질문">
      <div className="routine-chat-starters-track">
        {loopPrompts.map((prompt, index) => (
          <button
            key={`${prompt}-${index}`}
            type="button"
            className="routine-starter-chip"
            disabled={disabled}
            onClick={() => void onSelect(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
