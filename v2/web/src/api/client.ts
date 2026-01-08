const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let errorMessage = 'Request failed'
    let errorCode = 'UNKNOWN_ERROR'

    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorMessage
      errorCode = errorData.code || errorCode
    } catch {
      // Response wasn't JSON
    }

    throw new ApiRequestError(errorMessage, errorCode, res.status)
  }

  return res.json()
}

export async function apiRequestFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary
  })

  if (!res.ok) {
    let errorMessage = 'Request failed'
    let errorCode = 'UNKNOWN_ERROR'

    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorMessage
      errorCode = errorData.code || errorCode
    } catch {
      // Response wasn't JSON
    }

    throw new ApiRequestError(errorMessage, errorCode, res.status)
  }

  return res.json()
}
