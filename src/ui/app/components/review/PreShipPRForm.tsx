import { Sparkles, Loader2 } from 'lucide-react';

interface PreShipPRFormProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function PreShipPRForm({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onGenerate,
  isGenerating = false,
}: PreShipPRFormProps) {
  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Pull Request</div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="PR title..."
          className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        />

        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the changes in this PR..."
          rows={4}
          className="w-full rounded-xl bg-black/30 p-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
        />
      </div>
    </div>
  );
}
