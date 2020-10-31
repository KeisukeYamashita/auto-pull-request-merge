import * as github from '@actions/github'
import * as core from '@actions/core'
import Retry from './retry'
import {inspect} from 'util'

export interface Inputs {
  intervalSeconds: number
  repo: string
  owner: string
  pullRequestNumber: number
  token: string
  timeoutSeconds: number
}

export class Merger {
  private retry: Retry
  
  constructor(private cfg: Inputs) {
    this.retry = new Retry().timeout(this.cfg.timeoutSeconds).interval(this.cfg.intervalSeconds)
  }

  async merge(): Promise<void> {
    const client = github.getOctokit(this.cfg.token)
    const {owner, repo} = this.cfg

    const {data: pr} = await client.pulls.get({
      owner,
      repo,
      pull_number: this.cfg.pullRequestNumber
    })

    // "statuses_url" always exists
    const ref = pr.statuses_url.split('/').pop()!

    await this.retry.exec(
      async (count): Promise<void> => {
        try {
          const {
            data: commitStatuses
          } = await client.repos.listCommitStatusesForRef({
            owner,
            repo,
            ref
          })

          if (commitStatuses.every(status => status.state === 'success')) {
            throw new Error('not every commit status is success')
          }

          const totalStatus = commitStatuses.length
          const totalSuccessStatuses = commitStatuses.filter(
            status => status.state === 'success'
          ).length

          if (totalStatus - 1 !== totalSuccessStatuses) {
            throw new Error(
              `Not all status success, ${totalSuccessStatuses} out of ${totalStatus} success`
            )
          }
        } catch (err) {
          core.debug(`failed retry count:${count} with error ${inspect(err)}`)
          throw err
        }
      }
    )

    await client.pulls.merge({
      owner,
      repo,
      pull_number: this.cfg.pullRequestNumber
    })
  }
}

export default {
  Merger
}
