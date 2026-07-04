import axios from 'axios';
import type {
  Project,
  CreateProjectPayload,
  TreeNode,
  FileContent,
  SearchResult,
  TerminalResult,
} from './types';

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

export const WS_BASE: string = API_BASE.replace(/^http/, 'ws');

const http = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

export const api = {
  // ---- projects ----
  async listProjects(): Promise<Project[]> {
    const { data } = await http.get<Project[]>('/projects/');
    return data;
  },
  async getProject(id: string): Promise<Project> {
    const { data } = await http.get<Project>(`/projects/${id}`);
    return data;
  },
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await http.post<Project>('/projects/', payload);
    return data;
  },
  async deleteProject(id: string): Promise<void> {
    await http.delete(`/projects/${id}`);
  },

  // ---- files ----
  async getTree(projectId: string): Promise<TreeNode> {
    const { data } = await http.get<TreeNode>(`/projects/${projectId}/tree`);
    return data;
  },
  async getFile(projectId: string, path: string): Promise<FileContent> {
    const { data } = await http.get<FileContent>(`/projects/${projectId}/file`, {
      params: { path },
    });
    return data;
  },
  async saveFile(projectId: string, path: string, content: string): Promise<void> {
    await http.put(`/projects/${projectId}/file`, { content }, { params: { path } });
  },
  async deleteFile(projectId: string, path: string): Promise<void> {
    await http.delete(`/projects/${projectId}/file`, { params: { path } });
  },

  // ---- search ----
  async search(projectId: string, query: string, limit = 10): Promise<SearchResult[]> {
    const { data } = await http.post<SearchResult[]>(`/projects/${projectId}/search`, {
      query,
      limit,
    });
    return data;
  },

  // ---- terminal ----
  async runCommand(projectId: string, command: string): Promise<TerminalResult> {
    const { data } = await http.post<TerminalResult>(`/projects/${projectId}/terminal`, {
      command,
    });
    return data;
  },

  // ---- health ----
  async health(): Promise<boolean> {
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  },
};

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
