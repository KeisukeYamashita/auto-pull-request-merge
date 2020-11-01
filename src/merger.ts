import * as github from '@actions/github'
import * as core from '@actions/core'
import Retry from './retry'
import {inspect} from 'util'
import * as webhook from '@octokit/webhooks'

export interface Inputs {
  intervalSeconds: number
  labels: string[]
  repo: string
  owner: string
  pullRequestNumber: number
  token: string
  timeoutSeconds: number
}

export class Merger {
  private retry: Retry

  constructor(private cfg: Inputs) {
    this.retry = new Retry()
      .timeout(this.cfg.timeoutSeconds)
      .interval(this.cfg.intervalSeconds)
  }

  async merge(): Promise<void> {
    const client = github.getOctokit(this.cfg.token)
    const {owner, repo} = this.cfg

    await this.retry.exec(
      async (count): Promise<void> => {
        try {
          const {data: pr} = await client.pulls.get({
            owner,
            repo,
            pull_number: this.cfg.pullRequestNumber
          })

          if (this.cfg.labels.length > 0) {
            if (
              !this.cfg.labels.every(needLabel =>
                pr.labels.find(label => label.name === needLabel)
              )
            ) {
              throw new Error(`Needed Label not included in this pull request`)
            }
          }

          const eventPayload = (await import(
            process.env.GITHUB_EVENT_PATH!
          )) as webhook.EventPayloads.WebhookPayloadPullRequestPullRequest

          const {data: checks} = await client.checks.listForRef({
            owner: this.cfg.owner,
            repo: this.cfg.repo,
            ref: eventPayload.head.sha
          })

          const totalStatus = checks.total_count
          const totalSuccessStatuses = checks.check_runs.filter(
            check =>
              check.conclusion === 'success' || check.conclusion === 'skipped'
          ).length

          if (totalStatus - 1 !== totalSuccessStatuses) {
            throw new Error(
              `Not all status success, ${totalSuccessStatuses} out of ${totalStatus} success`
            )
          }

          await client.pulls.merge({
            owner,
            repo,
            pull_number: this.cfg.pullRequestNumber
          })
        } catch (err) {
          core.debug(`failed retry count:${count} with error ${inspect(err)}`)
          throw err
        }
      }
    )
  }
}

export default {
  Merger
}
