/**
 * IdeaList - Scrollable list of IdeaCards
 */
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IdeaCard } from './IdeaCard';
import type { Idea } from '../../../../types';

interface IdeaListProps {
  ideas: Idea[];
  activeIdeaId: string | null;
  searchQuery: string;
  onIdeaClick: (ideaId: string) => void;
}

export function IdeaList({ ideas, activeIdeaId, searchQuery, onIdeaClick }: IdeaListProps) {
  const filteredIdeas = useMemo(() => {
    if (!searchQuery.trim()) return ideas;
    const query = searchQuery.toLowerCase();
    return ideas.filter((idea) => {
      const title = (idea.title || 'Untitled Idea').toLowerCase();
      const tags = (idea.tags || []).join(' ').toLowerCase();
      const lastMessage = idea.messages[idea.messages.length - 1]?.content?.toLowerCase() || '';
      return title.includes(query) || tags.includes(query) || lastMessage.includes(query);
    });
  }, [ideas, searchQuery]);

  if (filteredIdeas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-xs text-white/30 text-center">
          {searchQuery ? 'No ideas match your search.' : 'No ideas yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-none">
      <AnimatePresence mode="popLayout">
        {filteredIdeas.map((idea) => (
          <motion.div
            key={idea.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            layout
          >
            <IdeaCard
              idea={idea}
              isActive={idea.id === activeIdeaId}
              onClick={() => onIdeaClick(idea.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
