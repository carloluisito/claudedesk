export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system';
  defaultProofMode: 'web' | 'api' | 'cli';
  logRetentionDays: number;
  autoCleanupArtifacts: boolean;
}

export interface VoiceSettings {
  whisperModel: 'tiny.en' | 'base.en' | 'small.en' | 'medium.en' | 'large';
  enabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  jobComplete: boolean;
  jobFailed: boolean;
}

export interface FavoritesSettings {
  repos: string[];
  recentRepos: string[];
}

export interface GitHubSettings {
  clientId?: string;
}

export interface GitLabSettings {
  clientId?: string;
}

export interface Settings {
  general: GeneralSettings;
  voice: VoiceSettings;
  notifications: NotificationSettings;
  favorites: FavoritesSettings;
  github: GitHubSettings;
  gitlab: GitLabSettings;
}

export interface ProjectDetection {
  exists: boolean;
  isDirectory: boolean;
  projectType: 'nodejs' | 'rust' | 'python' | 'go' | 'unknown' | null;
  framework: string | null;
  suggestedId: string;
  suggestedCommands: {
    install?: string;
    build?: string;
    test?: string;
    run?: string;
  };
  suggestedProof: {
    mode: 'web' | 'api' | 'cli';
    web?: {
      url: string;
      waitForSelector?: string;
      assertText?: string;
    };
    api?: {
      healthUrl: string;
      timeout?: number;
    };
    cli?: {
      command: string;
      assertStdout?: string;
      assertRegex?: string;
    };
  };
  suggestedPort: number | null;
  detectedFiles: string[];
}

export interface JobTemplate {
  id: string;
  name: string;
  description?: string;
  repoId: string;
  workflowId: string;
  prompt?: string;
  proof?: {
    mode: 'web' | 'api' | 'cli';
    web?: {
      url?: string;
      selector?: string;
      assertion?: string;
    };
    api?: {
      url?: string;
      timeout?: number;
    };
    cli?: {
      command?: string;
      expectedOutput?: string;
    };
  };
  voiceTrigger?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow';
  createdAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  scanPath: string;
  github?: {
    username: string;
    tokenScope: string;
    expiresAt: string | null;
  };
  gitlab?: {
    username: string;
    tokenScope: string;
    expiresAt: string | null;
  };
  createdAt: string;
  updatedAt?: string;
}
