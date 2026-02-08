// Prompt Template System Types

export type VariableName =
  | 'clipboard'
  | 'current_dir'
  | 'selection'
  | 'datetime'
  | 'date'
  | 'session_name';

export interface PromptTemplate {
  id: string;
  type: 'built-in' | 'user';
  name: string;
  description: string;
  prompt: string;
  keywords: string[];
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplatesData {
  version: 1;
  templates: PromptTemplate[];
  lastModified: number;
}

export interface TemplateCreateRequest {
  name: string;
  description: string;
  prompt: string;
  keywords: string[];
  icon?: string;
}

export interface TemplateUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  prompt?: string;
  keywords?: string[];
  icon?: string;
}

export interface VariableContext {
  clipboard?: string;
  currentDir?: string;
  selection?: string;
  sessionName?: string;
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches: {
    field: string;
    indices: number[];
  }[];
}
