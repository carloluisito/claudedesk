/**
 * WorkspacePicker - Chip-style workspace selection
 */

import { Folder, Loader2, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { HStack, VStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

interface Workspace {
  id: string;
  name: string;
  path: string;
}

interface WorkspacePickerProps {
  workspaces: Workspace[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  allowAll?: boolean;
}

export function WorkspacePicker({
  workspaces,
  selectedId,
  onSelect,
  isLoading = false,
  allowAll = true,
}: WorkspacePickerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <VStack gap={3} align="center" className="py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <Folder className="h-6 w-6 text-white/40" />
        </div>
        <Text variant="bodySm" color="tertiary" align="center">
          No workspaces found.
          <br />
          Add a workspace in Settings.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={3}>
      {/* All workspaces option */}
      {allowAll && (
        <button
          onClick={() => onSelect('')}
          className={cn(
            'flex items-center gap-3 rounded-xl p-3 text-left transition-colors',
            'ring-1',
            selectedId === ''
              ? 'bg-blue-500/10 ring-blue-500/30 text-blue-400'
              : 'bg-white/5 ring-white/10 text-white/70 hover:bg-white/10'
          )}
        >
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              selectedId === '' ? 'bg-blue-500/20' : 'bg-white/5'
            )}
          >
            <Folder className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <Text variant="body" color={selectedId === '' ? 'primary' : 'secondary'}>
              All Workspaces
            </Text>
            <Text variant="bodyXs" color="muted">
              Browse repos from all workspaces
            </Text>
          </div>
        </button>
      )}

      {/* Individual workspaces */}
      <div className="grid gap-2 grid-cols-2">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSelect(ws.id)}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-colors',
              'ring-1',
              selectedId === ws.id
                ? 'bg-blue-500/10 ring-blue-500/30'
                : 'bg-white/5 ring-white/10 hover:bg-white/10'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                selectedId === ws.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/50'
              )}
            >
              <Folder className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Text
                variant="bodySm"
                color={selectedId === ws.id ? 'primary' : 'secondary'}
                truncate="truncate"
              >
                {ws.name}
              </Text>
              <Text variant="bodyXs" color="muted" truncate="truncate">
                {ws.path}
              </Text>
            </div>
          </button>
        ))}
      </div>
    </VStack>
  );
}

export type { WorkspacePickerProps };
