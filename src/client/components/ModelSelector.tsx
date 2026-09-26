interface ModelSelectorProps {
  models: string[];
  currentModel: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  models,
  currentModel,
  onChange,
  disabled,
}: ModelSelectorProps) {
  return (
    <div className="model-selector">
      <label htmlFor="model-select">AI 모델</label>
      <select
        id="model-select"
        value={models.includes(currentModel) ? currentModel : models[0] ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || models.length === 0}
      >
        {models.length === 0 ? (
          <option value="">모델 불러오는 중...</option>
        ) : (
          models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
