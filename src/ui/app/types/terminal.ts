export type TimelineItemKind = 'read' | 'edit' | 'bash' | 'web';
export type TimelineItemStatus = 'running' | 'ok' | 'error';

export interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  label: string;
  status: TimelineItemStatus;
  ms: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

export interface SessionTab {
  id: string;
  name: string;
  repo: string;
  branch: string;
  dirtyFiles: number;
  pinned?: boolean;
}

export interface FileChange {
  path: string;
  status: 'created' | 'modified' | 'deleted';
}
