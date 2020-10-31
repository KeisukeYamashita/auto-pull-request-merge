import * as core from '@actions/core'
import {Inputs, Merger} from './merger'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const [owner, repo] = core.getInput('repository').split('/')

    const inputs: Inputs = {
      intervalSeconds: Number(core.getInput('intervalSeconds')) * 1000,
      labels: core.getInput('labels').split(','),
      owner,
      repo,
      pullRequestNumber: Number(core.getInput('pullRequestNumber')),
      token: core.getInput('token'),
      timeoutSeconds: Number(core.getInput('timeoutSeconds')) * 1000
    }

    core.debug(`Inputs: ${inspect(inputs)}`)

    const merger = new Merger(inputs)
    await merger.merge()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
