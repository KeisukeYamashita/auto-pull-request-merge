import * as core from '@actions/core'
import {Inputs, Merger, Strategy, labelStrategies} from './merger'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const [owner, repo] = core.getInput('repository').split('/')

    const inputs: Inputs = {
      checkStatus: core.getInput('checkStatus') === 'true',
      comment: core.getInput('comment'),
      ignoreLabels:
        core.getInput('ignoreLabels') === ''
          ? []
          : core.getInput('ignoreLabels').split(','),
      ignoreLabelsStrategy: core.getInput('labelsStrategy') as labelStrategies,
      failStep: core.getInput('failStep') === 'true',
      intervalSeconds:
        Number(core.getInput('intervalSeconds', {required: true})) * 1000,
      labels:
        core.getInput('labels') === ''
          ? []
          : core.getInput('labels').split(','),
      labelsStrategy: core.getInput('labelsStrategy') as labelStrategies,
      owner,
      repo,
      pullRequestNumber: Number(
        core.getInput('pullRequestNumber', {required: true})
      ),
      sha: core.getInput('sha', {required: true}),
      strategy: core.getInput('strategy', {required: true}) as Strategy,
      token: core.getInput('token', {required: true}),
      timeoutSeconds: Number(core.getInput('timeoutSeconds', {required: true}))
    }

    core.debug(`Inputs: ${inspect(inputs)}`)

    const merger = new Merger(inputs)
    await merger.merge()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
