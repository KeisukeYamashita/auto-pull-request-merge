import * as github from '@actions/github'
import * as core from '@actions/core'
import Retry from './retry'
import {inspect} from 'util'

export interface Inputs {
  checkStatus: boolean
  comment: string
  ignoreLabels: string[]
  failStep: boolean
  intervalSeconds: number
  labels: string[]
  repo: string
  owner: string
  pullRequestNumber: number
  sha: string
  strategy: Strategy
  token: string
  timeoutSeconds: number
}

export type Strategy = 'merge' | 'squash' | 'rebase'

export class Merger {
  private retry: Retry

  constructor(private cfg: Inputs) {
    this.retry = new Retry()
      .timeout(this.cfg.timeoutSeconds)
      .interval(this.cfg.intervalSeconds)
      .failStep(this.cfg.failStep)
  }

  async merge(): Promise<void> {
    const client = github.getOctokit(this.cfg.token)
    const {owner, repo} = this.cfg

    try {
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
                throw new Error(
                  `Needed Label not included in this pull request`
                )
              }

              if (
                pr.labels.some(label => this.cfg.labels.includes(label.name))
              ) {
                throw new Error(
                  `This pull request contains labels that should be ignored`
                )
              }
            }

            if (this.cfg.checkStatus) {
              const {data: checks} = await client.checks.listForRef({
                owner: this.cfg.owner,
                repo: this.cfg.repo,
                ref: this.cfg.sha
              })

              const totalStatus = checks.total_count
              const totalSuccessStatuses = checks.check_runs.filter(
                check =>
                  check.conclusion === 'success' ||
                  check.conclusion === 'skipped'
              ).length

              if (totalStatus - 1 !== totalSuccessStatuses) {
                throw new Error(
                  `Not all status success, ${totalSuccessStatuses} out of ${totalStatus} success`
                )
              }

              core.debug(`All ${totalStatus} status success`)
              core.debug(`Merge PR ${pr.number}`)
            }
          } catch (err) {
            core.debug(`failed retry count:${count} with error ${inspect(err)}`)
            throw err
          }
        }
      )

      if (this.cfg.comment) {
        await client.issues.createComment({
          owner: this.cfg.owner,
          repo: this.cfg.repo,
          issue_number: this.cfg.pullRequestNumber,
          body: this.cfg.comment
        })

        core.debug(`Post comment ${inspect(this.cfg.comment)}`)
      }

      await client.pulls.merge({
        owner,
        repo,
        pull_number: this.cfg.pullRequestNumber,
        merge_method: this.cfg.strategy
      })
    } catch (err) {
      core.debug(`Error on retry error:${inspect(err)}`)
      if (this.cfg.failStep) {
        throw err
      }
      core.debug('timeout but passing because "failStep" is configure to false')
    }
  }
}

export default {
  Merger
}
