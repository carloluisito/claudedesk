/**
 * MCP Server Catalog Frontend Types
 */

export type ServerCategory = 'development' | 'productivity' | 'data' | 'filesystem' | 'search' | 'cloud' | 'automation' | 'utilities';

export type MaintainerType = 'official' | 'community' | 'verified';

export interface ConfigField {
  key: string;
  name: string;
  description: string;
  type: 'string' | 'password' | 'path' | 'url' | 'number' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  helpUrl?: string;
  sensitive: boolean;
  default?: string;
  validation?: {
    pattern?: string;
    message?: string;
  };
  options?: string[];
}

export interface Prerequisite {
  name: string;
  command: string;
  args: string[];
  installUrl: Record<string, string>;
}

export interface PredefinedServerTemplate {
  templateId: string;
  name: string;
  description: string;
  longDescription?: string;
  iconName: string;
  category: ServerCategory;
  tags: string[];
  maintainer: MaintainerType;
  documentationUrl?: string;
  transport: 'stdio' | 'sse';
  command: string;
  args: string[];
  configFields: ConfigField[];
  prerequisites: Prerequisite[];
  platforms: ('windows' | 'darwin' | 'linux')[];
}

export interface PrerequisiteCheckResult {
  prerequisite: Prerequisite;
  installed: boolean;
  version?: string;
  error?: string;
}
