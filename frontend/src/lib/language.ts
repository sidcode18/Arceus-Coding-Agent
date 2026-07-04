const EXT_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  sh: 'shell',
  bash: 'shell',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'cpp',
  sql: 'sql',
  txt: 'txt',
};

/** Map a filename to a Monaco/editor language id. */
export function languageFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? 'txt';
}
