const API_BASE = '/api';
const LOGIN_URL = '/login';

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isHtmlResponse(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

function redirectToLogin(): never {
  window.location.href = LOGIN_URL;
  throw new ApiError('Session expired. Redirecting to login...', 401);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
  }

  const text = await response.text();

  if (isHtmlResponse(text)) {
    redirectToLogin();
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = text || response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Invalid JSON response from server');
  }
}

export async function get<T>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<T>(response);
}

export async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

export async function put<T>(endpoint: string, body: unknown): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

export async function del<T>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  return handleResponse<T>(response);
}

export type ProgressCallback = (progress: number) => void;

export async function upload<T>(file: File, onProgress?: ProgressCallback): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_BASE}/imports`);
    xhr.withCredentials = true;

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 401 || xhr.status === 403) {
        window.location.href = LOGIN_URL;
        reject(new ApiError('Session expired. Redirecting to login...', 401));
        return;
      }

      const text = xhr.responseText;

      if (isHtmlResponse(text)) {
        window.location.href = LOGIN_URL;
        reject(new ApiError('Session expired. Redirecting to login...', 401));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(text) as T;
          resolve(data);
        } catch {
          reject(new ApiError('Invalid JSON response from server'));
        }
      } else {
        let errorMessage = 'An error occurred';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = text || xhr.statusText;
        }
        reject(new ApiError(errorMessage, xhr.status));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('Network error occurred'));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('Upload aborted'));
    });

    xhr.send(formData);
  });
}

export { ApiError };
