# Auto Merge
[![CI](https://github.com/KeisukeYamashita/auto-merge/workflows/build-test/badge.svg)](https://github.com/KeisukeYamashita/auto-merge/actions?query=workflow%3Abuild-test)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Auto%20Merge-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/auto-merge)

A GitHub Action that post comment on a GitHub Issue or Pull Request.
If the same content is posted before, this action will delete the existing one and post a new one.

This action extract the number from an issue or a pull request which has triggered this by default. You don't need to specify the issue number by `${{ github.event.issue.number }}` or `${{ github.event.pull_request.number }}` if you want to post to its issue or pull request.

## Usage

```yml
      - name: Create Comment
        uses: KeisukeYamashita/auto-merge@v1
        with:
          number: 1
          comment: Comment for Issue or GitHub Pull Request
```

### Post a comment and close the previous same comment

This is just an example to show one way in which this action can be used.

```yml
on: pull_request
jobs:
  commit-message-check:
    runs-on: ubuntu-latest
    steps:
      - name: Auto merge
        uses: KeisukeYamashita/auto-merge@v1
```

### Action inputs

| Name | Description | Default |
| --- | --- | --- |
| `intervalSeconds` | Seconds between the check | `0.1` | 
| `repostiory` | The GitHub repository containing the pull request | Current repository | 
| `pullRequestNumber` | The number of the pull request. | `github.event.pull_request.number` |
| `timeoutSeconds` | Seconds to timeout this action | `60`
| `token` | `GITHUB_TOKEN` or a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). | `GITHUB_TOKEN` |

### Action outputs

Nothing.

### Accessing issues in other repositories

You can close issues in another repository by using a [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) instead of `GITHUB_TOKEN`.
The user associated with the PAT must have write access to the repository.

## License

[MIT](LICENSE)