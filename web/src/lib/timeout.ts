// Races a promise against a deadline so a hung upstream (LLM provider, model
// SDK) can't wedge a serverless function until the platform kills it. This does
// not cancel the underlying work — for fetch-based calls prefer AbortSignal —
// but it lets the handler return a clean error within maxDuration.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}
