**To update the webhook for an AWS CodeBuild project**

The following ``update-webhook`` example updates a webhook for the specified CodeBuild project with two filter groups. The ``--rotate-secret`` parameter specifies that GitHub rotate the project's secret key every time a code change triggers a build. The first filter group specifies pull requests that are created, updated, or reopened on branches with Git reference names that match the regular expression ``^refs/heads/master$`` and head references that match ``^refs/heads/myBranch$``.  The second filter group specifies push requests on branches with Git reference names that do not match the regular expression ``^refs/heads/myBranch$``. ::

    aws codebuild update-webhook \
        --project-name Project2 \
        --rotate-secret \
        --filter-groups "[[{\"type\":\"EVENT\",\"pattern\":\"PULL_REQUEST_CREATED, PULL_REQUEST_UPDATED, PULL_REQUEST_REOPENED\"},{\"type\":\"HEAD_REF\",\"pattern\":\"^refs/heads/myBranch$\",\"excludeMatchedPattern\":true},{\"type\":\"BASE_REF\",\"pattern\":\"^refs/heads/master$\",\"excludeMatchedPattern\":true}],[{\"type\":\"EVENT\",\"pattern\":\"PUSH\"},{\"type\":\"HEAD_REF\",\"pattern\":\"^refs/heads/myBranch$\",\"excludeMatchedPattern\":true}]]"

Output::

    {
        "webhook": {
            "filterGroups": [
                [
                    {
                        "pattern": "PULL_REQUEST_CREATED, PULL_REQUEST_UPDATED, PULL_REQUEST_REOPENED",
                        "type": "EVENT"
                    },
                    {
                        "excludeMatchedPattern": true,
                        "pattern": "refs/heads/myBranch$",
                        "type": "HEAD_REF"
                    },
                    {
                        "excludeMatchedPattern": true,
                        "pattern": "refs/heads/master$",
                        "type": "BASE_REF"
                    }
                ],
                [
                    {
                        "pattern": "PUSH",
                        "type": "EVENT"
                    },
                    {
                        "excludeMatchedPattern": true,
                        "pattern": "refs/heads/myBranch$",
                        "type": "HEAD_REF"
                    }
                ]
            ],
            "lastModifiedSecret": 1556312220.133
        }
    }

For more information, see `Change a Build Project's Settings (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/change-project.html#change-project-cli>`_ in the *AWS CodeBuild User Guide*
