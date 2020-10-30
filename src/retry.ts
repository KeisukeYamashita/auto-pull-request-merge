import * as core from '@actions/core'
import dayjs, { Dayjs } from 'dayjs'

export default class Retry {
    public _interval: number = 100
    public _timeout: number = 500

    private wait(): Promise<void> {
        return new Promise(
          (resolve): void => {
            setTimeout((): void => resolve(), this._interval)
          },
        )
    }

    public timeout(n: number): Retry {
        this._timeout = n
        return this
    }

    public async exec<T>(f: (count: number) => Promise<T>): Promise<T | undefined> {
        const timeout = this._timeout
        let count = 0
        let end = dayjs().add(timeout, 'second')
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

