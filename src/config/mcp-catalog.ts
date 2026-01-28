import { PredefinedServerTemplate, ServerCategory } from '../types.js';

/**
 * Curated catalog of popular MCP servers
 */
export const MCP_SERVER_CATALOG: PredefinedServerTemplate[] = [
  // =============================================================================
  // Development Servers
  // =============================================================================
  {
    templateId: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and PRs',
    longDescription: 'Official GitHub MCP server providing tools to search repositories, manage issues and pull requests, create branches, and more. Requires a GitHub Personal Access Token with appropriate permissions.',
    iconName: 'Github',
    category: 'development',
    tags: ['version-control', 'git', 'collaboration'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    configFields: [
      {
        key: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        name: 'Personal Access Token',
        description: 'GitHub PAT with repo and other necessary permissions',
        type: 'password',
        required: true,
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        helpUrl: 'https://github.com/settings/tokens/new',
        sensitive: true,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'git',
    name: 'Git',
    description: 'Git version control operations on local repositories',
    longDescription: 'Official Git MCP server for performing Git operations like reading logs, diffs, status, commits, and managing branches on local repositories.',
    iconName: 'GitBranch',
    category: 'development',
    tags: ['version-control', 'git'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
      {
        name: 'Git',
        command: 'git',
        args: ['--version'],
        installUrl: {
          windows: 'https://git-scm.com/download/win',
          darwin: 'https://git-scm.com/download/mac',
          linux: 'https://git-scm.com/download/linux',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'gitlab',
    name: 'GitLab',
    description: 'Interact with GitLab projects, issues, and merge requests',
    longDescription: 'Official GitLab MCP server for managing projects, issues, merge requests, and other GitLab resources. Requires a GitLab Personal Access Token.',
    iconName: 'GitMerge',
    category: 'development',
    tags: ['version-control', 'git', 'collaboration'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gitlab'],
    configFields: [
      {
        key: 'GITLAB_PERSONAL_ACCESS_TOKEN',
        name: 'Personal Access Token',
        description: 'GitLab PAT with api scope',
        type: 'password',
        required: true,
        placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
        helpUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
        sensitive: true,
      },
      {
        key: 'GITLAB_API_URL',
        name: 'GitLab API URL',
        description: 'GitLab API endpoint (defaults to gitlab.com)',
        type: 'url',
        required: false,
        placeholder: 'https://gitlab.com/api/v4',
        sensitive: false,
        default: 'https://gitlab.com/api/v4',
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Data Servers
  // =============================================================================
  {
    templateId: 'postgres',
    name: 'PostgreSQL',
    description: 'Query and manage PostgreSQL databases',
    longDescription: 'Official PostgreSQL MCP server for executing SQL queries, managing schemas, and interacting with PostgreSQL databases. Requires a PostgreSQL connection string.',
    iconName: 'Database',
    category: 'data',
    tags: ['database', 'sql', 'postgres'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    configFields: [
      {
        key: 'POSTGRES_CONNECTION_STRING',
        name: 'Connection String',
        description: 'PostgreSQL connection string',
        type: 'password',
        required: true,
        placeholder: 'postgresql://user:password@localhost:5432/dbname',
        helpUrl: 'https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING',
        sensitive: true,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'sqlite',
    name: 'SQLite',
    description: 'Query and manage SQLite databases',
    longDescription: 'Official SQLite MCP server for executing SQL queries on local SQLite database files. Lightweight and perfect for local data analysis.',
    iconName: 'Database',
    category: 'data',
    tags: ['database', 'sql', 'sqlite', 'local'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    configFields: [
      {
        key: 'SQLITE_DB_PATH',
        name: 'Database Path',
        description: 'Path to SQLite database file',
        type: 'path',
        required: true,
        placeholder: '/path/to/database.db',
        sensitive: false,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'mongodb',
    name: 'MongoDB',
    description: 'Query and manage MongoDB databases',
    longDescription: 'Official MongoDB MCP server for querying collections, managing documents, and performing aggregations on MongoDB databases.',
    iconName: 'Database',
    category: 'data',
    tags: ['database', 'nosql', 'mongodb'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/mongodb',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-mongodb'],
    configFields: [
      {
        key: 'MONGODB_URI',
        name: 'MongoDB URI',
        description: 'MongoDB connection URI',
        type: 'password',
        required: true,
        placeholder: 'mongodb://localhost:27017/mydb',
        helpUrl: 'https://www.mongodb.com/docs/manual/reference/connection-string/',
        sensitive: true,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Filesystem Servers
  // =============================================================================
  {
    templateId: 'filesystem',
    name: 'Filesystem',
    description: 'Read and write files on the local filesystem',
    longDescription: 'Official Filesystem MCP server providing secure read and write access to files and directories. Supports multiple allowed directories for sandboxed file access.',
    iconName: 'FolderOpen',
    category: 'filesystem',
    tags: ['files', 'io', 'local'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    configFields: [
      {
        key: 'ALLOWED_DIRECTORIES',
        name: 'Allowed Directories',
        description: 'Comma-separated list of directories to allow access (for security)',
        type: 'string',
        required: true,
        placeholder: '/path/to/dir1,/path/to/dir2',
        sensitive: false,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'memory',
    name: 'Memory',
    description: 'In-memory key-value store for context persistence',
    longDescription: 'Official Memory MCP server providing a simple key-value store that persists across conversation turns. Useful for maintaining context and state.',
    iconName: 'Brain',
    category: 'filesystem',
    tags: ['storage', 'state', 'persistence'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Automation Servers
  // =============================================================================
  {
    templateId: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation with Puppeteer',
    longDescription: 'Official Puppeteer MCP server for controlling headless Chrome/Chromium browsers. Automate web interactions, scraping, and testing.',
    iconName: 'Bot',
    category: 'automation',
    tags: ['browser', 'automation', 'scraping', 'testing'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'playwright',
    name: 'Playwright',
    description: 'Cross-browser automation with Playwright',
    longDescription: 'Official Playwright MCP server for automating Chromium, Firefox, and WebKit browsers. Supports screenshots, PDFs, and advanced browser interactions.',
    iconName: 'Bot',
    category: 'automation',
    tags: ['browser', 'automation', 'testing', 'cross-browser'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/playwright',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-playwright'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'fetch',
    name: 'Fetch',
    description: 'HTTP requests and web content fetching',
    longDescription: 'Official Fetch MCP server for making HTTP requests, downloading web content, and interacting with REST APIs. Supports GET, POST, PUT, DELETE methods.',
    iconName: 'Download',
    category: 'automation',
    tags: ['http', 'api', 'web', 'requests'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Search Servers
  // =============================================================================
  {
    templateId: 'brave-search',
    name: 'Brave Search',
    description: 'Web search powered by Brave Search API',
    longDescription: 'Official Brave Search MCP server providing web search capabilities through the Brave Search API. Requires a Brave Search API key.',
    iconName: 'Search',
    category: 'search',
    tags: ['search', 'web', 'api'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    configFields: [
      {
        key: 'BRAVE_API_KEY',
        name: 'Brave Search API Key',
        description: 'API key from Brave Search',
        type: 'password',
        required: true,
        placeholder: 'BSA...',
        helpUrl: 'https://brave.com/search/api/',
        sensitive: true,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Productivity Servers
  // =============================================================================
  {
    templateId: 'slack',
    name: 'Slack',
    description: 'Send messages and interact with Slack workspaces',
    longDescription: 'Official Slack MCP server for sending messages, reading channels, and managing Slack workspaces. Requires a Slack Bot Token with appropriate OAuth scopes.',
    iconName: 'MessageSquare',
    category: 'productivity',
    tags: ['communication', 'collaboration', 'messaging'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    configFields: [
      {
        key: 'SLACK_BOT_TOKEN',
        name: 'Bot User OAuth Token',
        description: 'Slack Bot Token (starts with xoxb-)',
        type: 'password',
        required: true,
        placeholder: 'xoxb-...',
        helpUrl: 'https://api.slack.com/authentication/token-types#bot',
        sensitive: true,
      },
      {
        key: 'SLACK_TEAM_ID',
        name: 'Team ID',
        description: 'Slack Team/Workspace ID',
        type: 'string',
        required: true,
        placeholder: 'T01234567',
        helpUrl: 'https://api.slack.com/methods/auth.test',
        sensitive: false,
      },
    ],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },

  // =============================================================================
  // Utilities Servers
  // =============================================================================
  {
    templateId: 'time',
    name: 'Time',
    description: 'Get current time and time zone information',
    longDescription: 'Official Time MCP server providing current time, timezone conversions, and date calculations. No configuration required.',
    iconName: 'Clock',
    category: 'utilities',
    tags: ['time', 'timezone', 'date'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-time'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
  {
    templateId: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Enhanced reasoning with sequential thinking patterns',
    longDescription: 'Official Sequential Thinking MCP server that enables Claude to use advanced step-by-step reasoning for complex problem-solving tasks.',
    iconName: 'Workflow',
    category: 'utilities',
    tags: ['reasoning', 'thinking', 'problem-solving'],
    maintainer: 'official',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    configFields: [],
    prerequisites: [
      {
        name: 'Node.js',
        command: 'node',
        args: ['--version'],
        installUrl: {
          windows: 'https://nodejs.org/en/download/',
          darwin: 'https://nodejs.org/en/download/',
          linux: 'https://nodejs.org/en/download/',
        },
      },
    ],
    platforms: ['windows', 'darwin', 'linux'],
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): PredefinedServerTemplate | undefined {
  return MCP_SERVER_CATALOG.find(t => t.templateId === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ServerCategory): PredefinedServerTemplate[] {
  return MCP_SERVER_CATALOG.filter(t => t.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): ServerCategory[] {
  const categories = new Set<ServerCategory>();
  MCP_SERVER_CATALOG.forEach(t => categories.add(t.category));
  return Array.from(categories).sort();
}
