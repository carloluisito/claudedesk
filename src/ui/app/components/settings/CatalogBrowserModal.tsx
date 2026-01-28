import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Modal } from '../ui/Modal';
import { useMCPCatalog } from '../../hooks/useMCPCatalog';
import { useMCPServers } from '../../hooks/useMCPServers';
import { ServerCard } from './ServerCard';
import { ServerDetailsSheet } from './ServerDetailsSheet';
import { SetupWizardModal } from './SetupWizardModal';
import { PredefinedServerTemplate, ServerCategory } from '../../types/mcp-catalog';
import { categoryLabels, categoryIcons } from '../../constants/mcp-categories';

interface CatalogBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CatalogBrowserModal({ isOpen, onClose }: CatalogBrowserModalProps) {
  const { catalog, isLoading } = useMCPCatalog();
  const { servers } = useMCPServers();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServerCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedServerTemplate | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedTemplate(null);
      setShowDetails(false);
      setShowWizard(false);
    }
  }, [isOpen]);

  // Get unique categories from catalog
  const categories = useMemo(() => {
    const cats = new Set<ServerCategory>();
    catalog.forEach((t) => cats.add(t.category));
    return Array.from(cats).sort();
  }, [catalog]);

  // Filter catalog based on search and category
  const filteredCatalog = useMemo(() => {
    let filtered = catalog;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [catalog, selectedCategory, searchQuery]);

  // Check which templates are already configured
  const configuredTemplateIds = useMemo(() => {
    const ids = new Set<string>();
    // Match by command and args pattern (simple heuristic)
    servers.forEach((server) => {
      catalog.forEach((template) => {
        if (
          server.command === template.command &&
          server.args?.join(' ').includes(template.args.join(' '))
        ) {
          ids.add(template.templateId);
        }
      });
    });
    return ids;
  }, [servers, catalog]);

  const handleCardClick = (template: PredefinedServerTemplate) => {
    setSelectedTemplate(template);
    setShowDetails(true);
  };

  const handleGetStarted = () => {
    setShowDetails(false);
    setShowWizard(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    setSelectedTemplate(null);
    // Servers will auto-refresh via useMCPServers polling
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Browse MCP Server Catalog" size="full">
        <div className="flex flex-col lg:flex-row gap-6 min-h-0 h-full">
          {/* Mobile: Horizontal pills with fade gradients */}
          <div className="lg:hidden">
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0b0f16] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0b0f16] to-transparent z-10 pointer-events-none" />
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                    selectedCategory === 'all'
                      ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {categoryLabels.all}
                </button>
                {categories.map((category) => {
                  const Icon = categoryIcons[category];
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                        selectedCategory === category
                          ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {categoryLabels[category]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop: Vertical sidebar */}
          <aside className="hidden lg:block w-44 flex-shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left',
                  selectedCategory === 'all'
                    ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <span>{categoryLabels.all}</span>
              </button>
              {categories.map((category) => {
                const Icon = categoryIcons[category];
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left',
                      selectedCategory === category
                        ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{categoryLabels[category]}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 min-h-0 space-y-4 overflow-y-auto">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search servers by name, description, or tags..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Result count */}
            {!isLoading && filteredCatalog.length > 0 && (
              <p className="text-sm text-white/60">
                {filteredCatalog.length} {filteredCatalog.length === 1 ? 'server' : 'servers'} found
              </p>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4" />
                <p className="text-sm text-white/60">Loading catalog...</p>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-white/60 mb-2">No servers found</p>
                <p className="text-xs text-white/40">
                  {searchQuery ? 'Try a different search term' : 'No servers in this category'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {filteredCatalog.map((template) => (
                  <ServerCard
                    key={template.templateId}
                    template={template}
                    isConfigured={configuredTemplateIds.has(template.templateId)}
                    onClick={() => handleCardClick(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Details Sheet */}
      {showDetails && selectedTemplate && (
        <ServerDetailsSheet
          template={selectedTemplate}
          isConfigured={configuredTemplateIds.has(selectedTemplate.templateId)}
          onClose={() => {
            setShowDetails(false);
            setSelectedTemplate(null);
          }}
          onGetStarted={handleGetStarted}
        />
      )}

      {/* Setup Wizard */}
      <SetupWizardModal
        isOpen={showWizard}
        template={selectedTemplate}
        onClose={() => {
          setShowWizard(false);
          setSelectedTemplate(null);
        }}
        onComplete={handleWizardComplete}
      />
    </>
  );
}
