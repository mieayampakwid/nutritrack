export function logError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error)
  } else {
    console.error(`[${context}] An error occurred.`)
  }
}
