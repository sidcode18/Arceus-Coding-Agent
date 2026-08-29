import axios from 'axios';
import type {
  Project,
  CreateProjectPayload,
  TreeNode,
  FileContent,
  SearchResult,
  TerminalResult,
  User,
  TokenResponse,
} from './types';

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

export const WS_BASE: string = API_BASE.replace(/^http/, 'ws');

const TOKEN_KEY = 'arceus_access_token';
const REFRESH_TOKEN_KEY = 'arceus_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const http = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry if the failed request was a refresh attempt itself
      if (originalRequest.url === '/auth/refresh') {
        clearTokens();
        window.dispatchEvent(new Event('arceus:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return http(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event('arceus:logout'));
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<TokenResponse>(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });
        setTokens(data.access_token, data.refresh_token);
        originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token;
        processQueue(null, data.access_token);
        isRefreshing = false;
        return http(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.dispatchEvent(new Event('arceus:logout'));
        processQueue(refreshError, null);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // ---- auth ----
  async register(payload: Record<string, string>): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/register', payload);
    return data;
  },
  async login(payload: Record<string, string>): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', payload.username);
    formData.append('password', payload.password);
    const { data } = await http.post<TokenResponse>('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },
  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refresh_token: refreshToken });
  },
  async getMe(): Promise<User> {
    const { data } = await http.get<User>('/auth/me');
    return data;
  },

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
  async prioritizeFile(projectId: string, path: string): Promise<void> {
    await http.post(`/projects/${projectId}/file/prioritize`, null, { params: { path } });
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
