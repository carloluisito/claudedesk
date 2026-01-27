import { HelpCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PlanQuestion } from '../../store/terminalStore';

interface QuestionsPanelProps {
  questions: PlanQuestion[];
  additionalContext: string;
  onAnswer: (questionId: string, answer: string) => void;
  onContextChange: (context: string) => void;
  onApprove: () => void;
  onCancel: () => void;
  isRunning: boolean;
}

export function QuestionsPanel({
  questions,
  additionalContext,
  onAnswer,
  onContextChange,
  onApprove,
  onCancel,
  isRunning,
}: QuestionsPanelProps) {
  const allAnswered = questions.every((q) => q.answer && q.answer.trim());

  return (
    <div className="rounded-3xl bg-blue-500/10 ring-1 ring-blue-500/30 p-4 overflow-hidden max-w-full w-full box-border">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 w-full max-w-full">
        <div className="flex items-center justify-center w-8 h-8 rounded-2xl bg-blue-500/20 ring-1 ring-blue-500/30 flex-shrink-0">
          <HelpCircle className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="font-semibold text-white text-sm break-words">
            Plan Ready - {questions.length} Question{questions.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-white/50 break-words">Answer below to proceed</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3 w-full max-w-full overflow-hidden">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="bg-white/5 rounded-2xl p-3 overflow-hidden w-full max-w-full ring-1 ring-white/10"
          >
            <div className="flex items-start gap-2 mb-2 min-w-0 w-full">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex-shrink-0 mt-0.5 ring-1 ring-blue-500/30">
                {index + 1}
              </span>
              <p className="text-sm text-white/85 break-words min-w-0 flex-1 [word-break:break-word]">
                {q.question}
              </p>
            </div>
            <div className="ml-7 max-w-full overflow-hidden">
              <input
                type="text"
                value={q.answer || ''}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || 'Type your answer...'}
                className="w-full max-w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500/50 box-border"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Additional Context */}
      <div className="mt-4 w-full max-w-full overflow-hidden">
        <label className="block text-xs text-white/50 mb-1.5">
          Additional context (optional)
        </label>
        <textarea
          value={additionalContext}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="Additional instructions..."
          rows={2}
          className="w-full max-w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500/50 resize-none box-border"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-4 w-full max-w-full">
        <button
          onClick={onCancel}
          disabled={isRunning}
          className="px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-50 order-2 sm:order-1 rounded-2xl hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onApprove}
          disabled={!allAnswered || isRunning}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors order-1 sm:order-2',
            allAnswered && !isRunning
              ? 'bg-blue-600 text-white hover:bg-blue-500 ring-1 ring-blue-500'
              : 'bg-white/10 text-white/40 cursor-not-allowed ring-1 ring-white/10'
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sm:hidden">Running...</span>
              <span className="hidden sm:inline">Executing...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span className="sm:hidden">Approve</span>
              <span className="hidden sm:inline">Approve & Execute</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
