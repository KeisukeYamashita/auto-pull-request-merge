import * as core from '@actions/core'
import {Inputs, Merger} from './merger'
import { inspect } from 'util'

async function run(): Promise<void> {
  try {
    const [owner, repo] = core.getInput('repository').split("/")

    const inputs: Inputs = {
      owner,
      repo,
      pullRequestNumber: Number(core.getInput('pullRequestNumber')),
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
