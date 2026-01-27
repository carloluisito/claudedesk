import { Search, ArrowLeft } from 'lucide-react';
import { AppHeader, HeaderButton } from '@/components/ui/AppHeader';

interface ReviewTopBarProps {
  title: string;
  subtitle?: string;
  sessionId?: string;
  onSearch?: () => void;
  showBackToSession?: boolean;
}

export function ReviewTopBar({
  title,
  subtitle,
  sessionId,
  onSearch,
  showBackToSession = true,
}: ReviewTopBarProps) {
  return (
    <AppHeader
      subtitle={subtitle}
      backTo={showBackToSession ? (sessionId ? `/terminal?sessionId=${sessionId}` : '/terminal') : undefined}
      actions={
        onSearch ? (
          <HeaderButton
            onClick={onSearch}
            icon={<Search className="h-4 w-4" />}
            label="Search"
          />
        ) : undefined
      }
    />
  );
}
