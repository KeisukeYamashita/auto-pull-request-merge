import * as core from '@actions/core'
import dayjs from 'dayjs'

export default class Retry {
  private _interval = 100
  private _timeout = 500

  private async wait(): Promise<void> {
    return new Promise((resolve): void => {
      setTimeout((): void => resolve(), this._interval)
    })
  }

  timeout(n: number): Retry {
    this._timeout = n
    return this
  }

  async exec<T>(f: (count: number) => Promise<T>): Promise<T | undefined> {
    const timeout = this._timeout
    let count = 0
    const end = dayjs().add(timeout, 'second')
    while (end.isAfter(dayjs())) {
      try {
        return await f(count++)
      } catch (err) {
        core.debug(err)
      } finally {
        await this.wait()
      }
    }
  }
}
