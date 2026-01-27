export type AppStatus = 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'FAILED';

export interface DockerConfig {
  enabled: boolean;
  imageName?: string;
  buildArgs?: Record<string, string>;
  volumes?: string[];
  memoryLimit?: string;
  cpuLimit?: number;
}

export interface RunConfig {
  port: number;
  env?: Record<string, string>;
  docker?: DockerConfig;
  tunnel?: { enabled: boolean };
  command?: string;
}

export interface ServiceProcess {
  serviceId: string;
  processId?: string;
  containerId?: string;
  port: number;
  status: 'starting' | 'running' | 'stopped' | 'failed';
  localUrl: string;
  tunnelUrl?: string;
  error?: string;
}

export interface DetectedService {
  id: string;
  name: string;
  path: string;
  framework?: string;
  runScript: 'dev' | 'start';
  suggestedPort: number;
}

export interface RunningApp {
  id: string;
  repoId: string;
  status: AppStatus;
  runConfig: RunConfig;
  containerId?: string;
  processId?: string;
  detectedPort?: number;
  localUrl?: string;
  tunnelUrl?: string;
  startedAt: string;
  error?: string;
  logs: string[];
  // Monorepo service support
  isMonorepo?: boolean;
  detectedServices?: DetectedService[];
  services?: Record<string, ServiceProcess>;
  serviceLogs?: Record<string, string[]>;
  primaryService?: string;
}

export interface DockerInfo {
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  needsRebuild: boolean | null;
}

export interface DockerStatus {
  available: boolean;
  message: string;
}

export interface EnvVar {
  key: string;
  value: string;
}
