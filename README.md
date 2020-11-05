# Auto Pull Request Merge
[![CI][CI]][CI-status]
[![GitHub Marketplace][MarketPlace]][MarketPlace-status]
[![Mergify Status][mergify-status]][mergify]

<p align="center">
  <img src="https://media.giphy.com/media/TbYgHMnICI1A4/giphy.gif" style="width:70%;margin:20px 0px;">
<p align="center">

A GitHub Action that merges a pull request automatically by the latest commit check status.

Other GitHub Actions that do merge automatically are like merging based on some user input.
**This GitHub Actions is designed to merge automatically when a pull request comes in.**

This action extract the number from a pull request which has triggered this by default. You don't need to specify the pull request number by `${{ github.event.pull_request.number }}`.

## Usage

```yml
      - name: Merge
        uses: KeisukeYamashita/auto-pull-request-merge@v1
```

### Trigger by `pull_request` event with custom check

This is just an example to show one way in which this action can be used.

```yml
on: pull_request
jobs:
  auto-merge:
    - name: Merge
      uses: KeisukeYamashita/auto-pull-request-merge@v1
      with:
        intervalSeconds: 10
        timeoutSeconds: 30
```

### Action inputs

| Name | Description | Default |
| --- | --- | --- |
| `comment` | Comments to post before merging the pull request | - |
| `failStep` | Fail the step if no PR has merged | `false` |  
| `ignoreLabels` | Label that the target pull request shouldn't have | - |
| `labels` | Label that the target pull request should have | - |
| `intervalSeconds` | Seconds between the check | `0.1` | 
| `repostiory` | The GitHub repository containing the pull request | Current repository | 
| `pullRequestNumber` | The number of the pull request. | `github.event.pull_request.number` |
| `sha` | SHA of the commit. | `github.event.pull_request.head.number` |
| `timeoutSeconds` | Seconds to timeout this action | `60`
| `token` | `GITHUB_TOKEN` or a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). | `GITHUB_TOKEN` |

### Action outputs

Nothing.

### Disclaimer

#### GitHub API rate limit consumption

When a Pull Request is created, this GitHub Actions polls the commit status of the Pull Request and if it's ready to merge, it will merge it. You can set the interval by `intervalSeconds`, but depending on the user's input, you may be subject to an inordinate number of API calls. Be careful when setting this up.

#### GitHub Actions charge and quota

GitHub Actions are charged by runtime, and quotas are set for some users on free plans and other plans.
This action checks for other statuses to pass, so it can take a lot of time to run.
By default, it is set to time out after 1 minute, but you can change by `timeoutSeconds` if you need to.

## License

[MIT](LICENSE)

<!-- Badge links -->
[CI]: https://github.com/KeisukeYamashita/auto-pull-request-merge/workflows/build-test/badge.svg
[CI-status]: https://github.com/KeisukeYamashita/auto-pull-request-merge/actions?query=workflow%3Abuild-test

[MarketPlace]: https://img.shields.io/badge/Marketplace-Auto%20Pull%20Request%20Merge-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=
[MarketPlace-status]: https://github.com/marketplace/actions/auto-pull-request-merge-merge

[mergify]: https://mergify.io
[mergify-status]: https://img.shields.io/endpoint.svg?url=https://gh.mergify.io/badges/KeisukeYamashita/auto-pull-request-merge&style=flat
