import * as core from '@actions/core'
import {Inputs, Merger, Strategy} from './merger'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const [owner, repo] = core.getInput('repository').split('/')

    const inputs: Inputs = {
      checkStatus: core.getInput('checkStatus') === 'true',
      comment: core.getInput('comment'),
      ignoreLabels:
        core.getInput('labels') === ''
          ? []
          : core.getInput('labels').split(','),
      failStep: core.getInput('failStep') === 'true',
      intervalSeconds: Number(core.getInput('intervalSeconds')) * 1000,
      labels:
        core.getInput('labels') === ''
          ? []
          : core.getInput('labels').split(','),
      owner,
      repo,
      pullRequestNumber: Number(core.getInput('pullRequestNumber')),
      sha: core.getInput('sha'),
      strategy: core.getInput('strategy') as Strategy,
      token: core.getInput('token'),
      timeoutSeconds: Number(core.getInput('timeoutSeconds'))
    }

    core.debug(`Inputs: ${inspect(inputs)}`)

    const merger = new Merger(inputs)
    await merger.merge()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
