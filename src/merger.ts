import * as github from '@actions/github'
import * as core from '@actions/core'
import {PullsGetResponseData} from '@octokit/types'
import Retry from './retry'
import {inspect} from 'util'

export type labelStrategies = 'all' | 'atLeastOne'

export interface Inputs {
  checkStatus: boolean
  comment: string
  dryRun: boolean
  ignoreLabels: string[]
  ignoreLabelsStrategy: labelStrategies
  failStep: boolean
  intervalSeconds: number
  labels: string[]
  labelsStrategy: labelStrategies
  repo: string
  owner: string
  pullRequestNumber: number
  sha: string
  strategy: Strategy
  token: string
  timeoutSeconds: number
}

export type Strategy = 'merge' | 'squash' | 'rebase'

interface ValidationResult {
  failed: boolean
  message: string
}

export class Merger {
  private retry: Retry

  constructor(private cfg: Inputs) {
    this.retry = new Retry()
      .timeout(this.cfg.timeoutSeconds)
      .interval(this.cfg.intervalSeconds)
      .failStep(this.cfg.failStep)
  }

  private isAllLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    type: 'labels' | 'ignoreLabels'
  ): ValidationResult {
    const hasLabels = pr.labels
      .filter(prLabel => {
        labels.includes(prLabel.name)
      })
      .map(label => label.name)

    let failed = true
    if (type === 'labels' && hasLabels.length === labels.length) {
      failed = false
    }
    if (type === 'ignoreLabels' && !hasLabels.length) {
      failed = false
    }

    return {
      failed,
      message: `PR ${pr.id} ${
        type === 'labels' ? '' : "does't"
      } contains all ${inspect(labels)} for PR labels ${inspect(
        pr.labels.map(l => l.name)
      )}`
    }
  }

  private isAtLeastOneLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    type: 'labels' | 'ignoreLabels'
  ): ValidationResult {
    const hasLabels = pr.labels
      .filter(prLabel => {
        labels.includes(prLabel.name)
      })
      .map(label => label.name)

    let failed = true
    if (type === 'labels' && hasLabels.length) {
      failed = false
    }
    if (type === 'ignoreLabels' && hasLabels.length) {
      failed = false
    }

    return {
      failed,
      message: `PR ${pr.id} ${
        type === 'labels' ? '' : "does't"
      } contains ${inspect(labels)} for PR labels ${inspect(
        pr.labels.map(l => l.name)
      )}`
    }
  }

  private isLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    strategy: labelStrategies,
    type: 'labels' | 'ignoreLabels'
  ): ValidationResult {
    switch (strategy) {
      case 'atLeastOne':
        return this.isAtLeastOneLabelsValid(pr, labels, type)
      case 'all':
      default:
        return this.isAllLabelsValid(pr, labels, type)
    }
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

            if (this.cfg.labels.length) {
              const labelResult = this.isLabelsValid(
                pr,
                this.cfg.labels,
                this.cfg.labelsStrategy,
                'labels'
              )
              if (labelResult.failed) {
                throw new Error(`Checked labels failed: ${labelResult.message}`)
              }

              core.debug(
                `Checked labels and passed with message:${labelResult.message} with ${this.cfg.labelsStrategy}`
              )
              core.info(
                `Checked labels and passed with ignoreLabels:${inspect(
                  this.cfg.labels
                )}`
              )
            }

            if (this.cfg.ignoreLabels.length) {
              const ignoreLabelResult = this.isLabelsValid(
                pr,
                this.cfg.ignoreLabels,
                this.cfg.ignoreLabelsStrategy,
                'ignoreLabels'
              )
              if (ignoreLabelResult.failed) {
                throw new Error(
                  `Checked ignore labels failed: ${ignoreLabelResult.message}`
                )
              }

              core.debug(
                `Checked ignore labels and passed with message:${ignoreLabelResult.message} with ${this.cfg.ignoreLabelsStrategy} strategy`
              )
              core.info(
                `Checked ignore labels and passed with ignoreLabels:${inspect(
                  this.cfg.ignoreLabels
                )}`
              )
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
                  `Not all status success, ${totalSuccessStatuses} out of ${
                    totalStatus - 1
                  } (ignored this check) success`
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
        const {data: resp} = await client.issues.createComment({
          owner: this.cfg.owner,
          repo: this.cfg.repo,
          issue_number: this.cfg.pullRequestNumber,
          body: this.cfg.comment
        })

        core.debug(`Post comment ${inspect(this.cfg.comment)}`)
        core.setOutput(`commentID`, resp.id)
      }

      if (!this.cfg.dryRun) {
        await client.pulls.merge({
          owner,
          repo,
          pull_number: this.cfg.pullRequestNumber,
          merge_method: this.cfg.strategy
        })
        core.setOutput('merged', true)
      } else {
        core.info(`dry run merge action`)
        core.setOutput('merged', false)
      }
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
