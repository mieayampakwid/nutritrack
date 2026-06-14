import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError } from './logger'

describe('logError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('logs full error in DEV mode', () => {
    vi.stubEnv('DEV', true)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('TestContext', new Error('test error'))

    expect(spy).toHaveBeenCalledWith('[TestContext]', expect.any(Error))
  })

  it('logs generic message in production', () => {
    vi.stubEnv('DEV', false)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('TestContext', new Error('secret details'))

    expect(spy).toHaveBeenCalledWith('[TestContext] An error occurred.')
  })
})
