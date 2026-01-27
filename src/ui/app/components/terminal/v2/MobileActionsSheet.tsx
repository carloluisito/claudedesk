import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Clock, FileDiff, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Timeline, TimelineItem } from './Timeline';
import { ChangesCard, ChangedFile } from './ChangesCard';

type SheetTab = 'timeline' | 'changes';

interface MobileActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SheetTab;
  timelineItems: TimelineItem[];
  changedFiles: ChangedFile[];
  onViewDiffs?: () => void;
  onFileClick?: (path: string) => void;
}

export function MobileActionsSheet({
  isOpen,
  onClose,
  initialTab = 'timeline',
  timelineItems,
  changedFiles,
  onViewDiffs,
  onFileClick,
}: MobileActionsSheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>(initialTab);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 flex max-h-[80vh] flex-col rounded-t-3xl bg-[#0d1117] ring-1 ring-white/10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-white/10 px-4">
              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/50'
                )}
              >
                <Clock className="h-4 w-4" />
                Timeline
                {timelineItems.length > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">
                    {timelineItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('changes')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'changes'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/50'
                )}
              >
                <FileDiff className="h-4 w-4" />
                Changes
                {changedFiles.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                    {changedFiles.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-safe scroll-touch">
              {activeTab === 'timeline' && (
                <div>
                  {timelineItems.length > 0 ? (
                    <Timeline items={timelineItems} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-white/50">
                      <Clock className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No activity yet</p>
                      <p className="text-xs mt-1">Tool activities will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'changes' && (
                <div>
                  {changedFiles.length > 0 ? (
                    <>
                      <ChangesCard
                        files={changedFiles}
                        onViewDiffs={onViewDiffs}
                        onFileClick={onFileClick}
                      />
                      {onViewDiffs && (
                        <button
                          onClick={() => {
                            onClose();
                            onViewDiffs();
                          }}
                          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-black"
                        >
                          View All Diffs
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-white/50">
                      <FileDiff className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No changes</p>
                      <p className="text-xs mt-1">Modified files will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Close button */}
            <div className="flex-shrink-0 border-t border-white/10 p-4 pb-safe">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 text-sm font-medium text-white/70 ring-1 ring-white/10"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
