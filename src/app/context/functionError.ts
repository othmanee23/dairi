type FunctionError = { message: string; context?: unknown };

export async function functionErrorMessage(error: FunctionError, data?: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }

  const context = error.context as { clone?: () => { json?: () => Promise<unknown> } } | undefined;
  if (typeof context?.clone === 'function') {
    try {
      const body = await context.clone().json?.();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      // Keep the SDK message when the response is empty or not JSON.
    }
  }

  return error.message;
}
