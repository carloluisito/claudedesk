export type SessionHealth = 'Clean' | 'Changes' | 'Running' | 'Error';
export type SessionMode = 'Plan' | 'Direct';

export interface Session {
  id: string;
  title: string;
  repo: string;
  branch: string;
  lastActive: string;
  mode: SessionMode;
  health: SessionHealth;
  pinned?: boolean;
}
