import { Code, Database, Folder, Bot, Search, Briefcase, Cloud, Wrench } from 'lucide-react';
import type { ServerCategory } from '../types/mcp-catalog';

export const categoryLabels: Record<ServerCategory | 'all', string> = {
  all: 'All Categories',
  development: 'Development',
  productivity: 'Productivity',
  data: 'Data',
  filesystem: 'Filesystem',
  search: 'Search',
  cloud: 'Cloud',
  automation: 'Automation',
  utilities: 'Utilities',
};

export const categoryIcons: Record<ServerCategory, React.ComponentType<{ className?: string }>> = {
  development: Code,
  productivity: Briefcase,
  data: Database,
  filesystem: Folder,
  search: Search,
  cloud: Cloud,
  automation: Bot,
  utilities: Wrench,
};
