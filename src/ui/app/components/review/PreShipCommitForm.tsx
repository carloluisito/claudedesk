import { FileText, Edit3 } from 'lucide-react';

interface PreShipCommitFormProps {
  message: string;
  onMessageChange: (message: string) => void;
}

export function PreShipCommitForm({
  message,
  onMessageChange,
}: PreShipCommitFormProps) {
  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileText className="h-4 w-4" />
          Commit Message
        </div>
        <Edit3 className="h-4 w-4 text-white/40" />
      </div>

      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Describe your changes..."
        rows={3}
        className="mt-3 w-full rounded-2xl bg-black/30 p-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
      />
    </div>
  );
}
