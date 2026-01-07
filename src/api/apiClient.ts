const API_BASE = '/backend/api.php';
const UPLOAD_URL = '/backend/upload.php';
const LOGIN_URL = '/backend/login.php';

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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}?${endpoint.replace(/^\?/, '')}`;
  
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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}?${endpoint.replace(/^\?/, '')}`;
  
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

export async function upload<T>(file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  return handleResponse<T>(response);
}

export { ApiError };
