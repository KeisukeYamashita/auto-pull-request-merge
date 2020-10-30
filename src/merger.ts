import * as github from '@actions/github'
import {ReposListCommitStatusesForRefResponseData} from '@octokit/types'
import * as core from '@actions/core'
import Retry from './retry'
import {inspect} from 'util'

export interface Inputs {
  repo: string
  owner: string
  pullRequestNumber: number
  token: string
  timeoutSeconds: number
}

export class Merger {
  constructor(private cfg: Inputs) {}

  async merge(): Promise<void> {
    const client = github.getOctokit(this.cfg.token)
    const retry = new Retry().timeout(this.cfg.timeoutSeconds)
    const {owner, repo} = this.cfg

    const {data: pr} = await client.pulls.get({
      owner,
      repo,
      pull_number: this.cfg.pullRequestNumber
    })

    const ref = pr.statuses_url.split('/').pop()!

    await retry.exec(
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
        } catch (err) {
          core.debug(`failed retry count:${count} with error ${inspect(err)}`)
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
