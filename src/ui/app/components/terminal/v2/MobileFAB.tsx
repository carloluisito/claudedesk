import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Play,
  Eye,
  Rocket,
  Bot,
  Clock,
  FileDiff,
} from 'lucide-react';
import { cn } from '../../../lib/cn';

interface MobileFABProps {
  onRun: () => void;
  onShip: () => void;
  onAgents: () => void;
  onTimeline: () => void;
  onChanges: () => void;
  hasRunningApp?: boolean;
  changesCount?: number;
}

export function MobileFAB({
  onRun,
  onShip,
  onAgents,
  onTimeline,
  onChanges,
  hasRunningApp = false,
  changesCount = 0,
}: MobileFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'run',
      label: hasRunningApp ? 'Preview' : 'Run',
      icon: hasRunningApp ? Eye : Play,
      onClick: onRun,
      color: hasRunningApp ? 'bg-emerald-500' : 'bg-white/10',
      textColor: hasRunningApp ? 'text-white' : 'text-white',
    },
    {
      id: 'ship',
      label: 'Ship',
      icon: Rocket,
      onClick: onShip,
      color: 'bg-white',
      textColor: 'text-black',
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: Bot,
      onClick: onAgents,
      color: 'bg-blue-500/20',
      textColor: 'text-blue-400',
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: Clock,
      onClick: onTimeline,
      color: 'bg-white/10',
      textColor: 'text-white',
    },
    {
      id: 'changes',
      label: `Changes${changesCount > 0 ? ` (${changesCount})` : ''}`,
      icon: FileDiff,
      onClick: onChanges,
      color: changesCount > 0 ? 'bg-amber-500/20' : 'bg-white/10',
      textColor: changesCount > 0 ? 'text-amber-400' : 'text-white',
    },
  ];

  const handleAction = (action: (typeof actions)[0]) => {
    setIsOpen(false);
    action.onClick();
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05, duration: 0.15 }}
                  onClick={() => handleAction(action)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-white/10 shadow-lg min-w-[140px]',
                    action.color,
                    action.textColor
                  )}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors',
          isOpen
            ? 'bg-white/10 ring-1 ring-white/20'
            : 'bg-blue-500 hover:bg-blue-600'
        )}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
        </motion.div>

        {/* Badge for changes count */}
        {!isOpen && changesCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
            {changesCount > 9 ? '9+' : changesCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
