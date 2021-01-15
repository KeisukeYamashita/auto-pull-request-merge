import * as github from '@actions/github'
import * as core from '@actions/core'
import {PullsGetResponseData} from '@octokit/types'
import Retry from './retry'
import {inspect} from 'util'

export type labelStrategies = 'all' | 'atLeastOne'

export interface Inputs {
  checkStatus: boolean
  comment: string
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
  status: boolean
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
    const hasLabelsCount = pr.labels
      .filter(prLabel => {
        labels.includes(prLabel.name)
      })
      .map(label => label.name)

    let status = true
    if (type === 'labels' && hasLabelsCount.length === labels.length) {
      status = false
    }
    if (type === 'ignoreLabels' && hasLabelsCount.length) {
      status = false
    }

    return {
      status,
      message: `PR ${pr.id} ${
        type === 'ignoreLabels' ? "does't" : ''
      } contains all ${inspect(hasLabelsCount)}`
    }
  }

  private isAtLeastOneLabelsValid(
    pr: PullsGetResponseData,
    labels: string[],
    type: 'labels' | 'ignoreLabels'
  ): ValidationResult {
    const hasLabelsCount = pr.labels
      .filter(prLabel => {
        labels.includes(prLabel.name)
      })
      .map(label => label.name)

    let status = true
    if (type === 'labels' && hasLabelsCount.length) {
      status = false
    }
    if (type === 'ignoreLabels' && hasLabelsCount.length) {
      status = false
    }

    return {
      status,
      message: `PR ${pr.id} ${
        type === 'ignoreLabels' ? "does't" : ''
      } contains all ${inspect(hasLabelsCount)}`
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

            if (this.cfg.labels.length > 0) {
              const labelResult = this.isLabelsValid(
                pr,
                this.cfg.labels,
                this.cfg.labelsStrategy,
                'labels'
              )
              if (!labelResult.status) {
                throw new Error(labelResult.message)
              }
            }

            if (this.cfg.ignoreLabels.length > 0) {
              const ignoreLabelResult = this.isLabelsValid(
                pr,
                this.cfg.labels,
                this.cfg.labelsStrategy,
                'ignoreLabels'
              )
              if (!ignoreLabelResult.status) {
                throw new Error(ignoreLabelResult.message)
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
        const {data: resp} = await client.issues.createComment({
          owner: this.cfg.owner,
          repo: this.cfg.repo,
          issue_number: this.cfg.pullRequestNumber,
          body: this.cfg.comment
        })

        core.debug(`Post comment ${inspect(this.cfg.comment)}`)
        core.setOutput(`commentID`, resp.id)
      }

      await client.pulls.merge({
        owner,
        repo,
        pull_number: this.cfg.pullRequestNumber,
        merge_method: this.cfg.strategy
      })
      core.setOutput('merged', true)
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
