/**
 * FileTree - Collapsible file tree for review screen
 */

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
  approved?: boolean;
}

interface FileTreeProps {
  files: FileChange[];
  selectedPath?: string;
  onSelectFile: (path: string) => void;
  onApproveFile?: (path: string) => void;
  onRejectFile?: (path: string) => void;
  showApprovalActions?: boolean;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileChange;
}

// Build tree structure from flat file list
function buildTree(files: FileChange[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existingNode = current.find((n) => n.name === part);

      if (existingNode) {
        if (isLast) {
          existingNode.file = file;
        } else {
          current = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.push(newNode);
        if (!isLast) {
          current = newNode.children;
        }
      }
    }
  }

  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
    return nodes;
  };

  return sortNodes(root);
}

const statusIcons: Record<FileChange['status'], React.ReactNode> = {
  added: <Plus className="h-3 w-3 text-emerald-400" />,
  modified: <Edit3 className="h-3 w-3 text-amber-400" />,
  deleted: <Minus className="h-3 w-3 text-red-400" />,
  renamed: <Edit3 className="h-3 w-3 text-blue-400" />,
};

export function FileTree({
  files,
  selectedPath,
  onSelectFile,
  onApproveFile,
  onRejectFile,
  showApprovalActions = false,
  className,
}: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-expand all directories on mount
  useMemo(() => {
    const allDirs = new Set<string>();
    const findDirs = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.isDir) {
          allDirs.add(node.path);
          findDirs(node.children);
        }
      }
    };
    findDirs(tree);
    setExpandedDirs(allDirs);
  }, [tree]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedPath === node.path;

    if (node.isDir) {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleDir(node.path)}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-left',
              'hover:bg-white/5 transition-colors'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-white/40" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            )}
            <Folder className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-white/70 truncate">{node.name}</span>
          </button>
          {isExpanded && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const file = node.file!;
    return (
      <div
        key={node.path}
        className={cn(
          'group flex items-center gap-1.5 rounded-lg px-2 py-1.5',
          'transition-colors cursor-pointer',
          isSelected ? 'bg-blue-500/20 ring-1 ring-blue-500/30' : 'hover:bg-white/5'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        <File className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
        <span
          className={cn(
            'text-sm truncate flex-1',
            isSelected ? 'text-white' : 'text-white/70'
          )}
        >
          {node.name}
        </span>
        {statusIcons[file.status]}

        {/* Stats */}
        {(file.additions || file.deletions) && (
          <span className="text-xs text-white/40">
            {file.additions ? (
              <span className="text-emerald-400">+{file.additions}</span>
            ) : null}
            {file.additions && file.deletions ? ' ' : ''}
            {file.deletions ? (
              <span className="text-red-400">-{file.deletions}</span>
            ) : null}
          </span>
        )}

        {/* Approval indicator */}
        {file.approved !== undefined && (
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full',
              file.approved ? 'bg-emerald-500/20' : 'bg-white/10'
            )}
          >
            {file.approved && <Check className="h-2.5 w-2.5 text-emerald-400" />}
          </span>
        )}

        {/* Approval actions */}
        {showApprovalActions && (
          <HStack
            gap={0}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApproveFile?.(node.path);
              }}
              className="p-1 rounded hover:bg-emerald-500/20"
              title="Approve file"
            >
              <Check className="h-3 w-3 text-emerald-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRejectFile?.(node.path);
              }}
              className="p-1 rounded hover:bg-red-500/20"
              title="Reject file"
            >
              <X className="h-3 w-3 text-red-400" />
            </button>
          </HStack>
        )}
      </div>
    );
  };

  return (
    <div className={cn('overflow-y-auto', className)}>
      <VStack gap={0}>
        {tree.map((node) => renderNode(node, 0))}
      </VStack>

      {files.length === 0 && (
        <div className="py-8 text-center">
          <Text variant="bodySm" color="muted">
            No changes to review
          </Text>
        </div>
      )}
    </div>
  );
}

export type { FileTreeProps, FileChange };
