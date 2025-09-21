**To create webhook filters for an AWS CodeBuild project**

The following ``create-webhook`` example creates a webhook for a CodeBuild project named ``my-project`` that has two filter groups. The first filter group specifies pull requests that are created, updated, or reopened on branches with Git reference names that match the regular expression ``^refs/heads/master$`` and head references that match ``^refs/heads/myBranch$``.  The second filter group specifies push requests on branches with Git reference names that do not match the regular expression ``^refs/heads/myBranch$``. ::

    aws codebuild create-webhook \
        --project-name my-project \
        --filter-groups "[[{\"type\":\"EVENT\",\"pattern\":\"PULL_REQUEST_CREATED, PULL_REQUEST_UPDATED, PULL_REQUEST_REOPENED\"},{\"type\":\"HEAD_REF\",\"pattern\":\"^refs/heads/myBranch$\",\"excludeMatchedPattern\":true},{\"type\":\"BASE_REF\",\"pattern\":\"^refs/heads/master$\",\"excludeMatchedPattern\":true}],[{\"type\":\"EVENT\",\"pattern\":\"PUSH\"},{\"type\":\"HEAD_REF\",\"pattern\":\"^refs/heads/myBranch$\",\"excludeMatchedPattern\":true}]]"

Output::

    {
        "webhook": {
            "payloadUrl": "https://codebuild.us-west-2.amazonaws.com/webhooks?t=eyJlbmNyeXB0ZWREYXRhIjoiVVl5MGtoeGRwSzZFRXl2Wnh4bld1Z0tKZ291TVpQNEtFamQ3RDlDYWpRaGIreVFrdm9EQktIVk1NeHJEWEpmUDUrVUNOMUIyRHJRc1VxcHJ6QlNDSnljPSIsIml2UGFyYW1ldGVyU3BlYyI6InN4Tm1SeUt5MUhaUVRWbGciLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&v=1",
            "url": "https://api.github.com/repos/iversonic/codedeploy-sample/hooks/105190656",
            "lastModifiedSecret": 1556311319.069,
            "filterGroups": [
                [
                    {
                        "type": "EVENT",
                        "pattern": "PULL_REQUEST_CREATED, PULL_REQUEST_UPDATED, PULL_REQUEST_REOPENED",
                        "excludeMatchedPattern": false
                    },
                    {
                        "type": "HEAD_REF",
                        "pattern": "refs/heads/myBranch$",
                        "excludeMatchedPattern": true
                    },
                    {
                        "type": "BASE_REF",
                        "pattern": "refs/heads/master$",
                        "excludeMatchedPattern": true
                    }
                ],
                [
                    {
                        "type": "EVENT",
                        "pattern": "PUSH",
                        "excludeMatchedPattern": false
                    },
                    {
                        "type": "HEAD_REF",
                        "pattern": "refs/heads/myBranch$",
                        "excludeMatchedPattern": true
                    }
                ]
            ]
        }
    }

For more information, see `Filter GitHub Webhook Events (SDK) <https://docs.aws.amazon.com/codebuild/latest/userguide/sample-github-pull-request.html#sample-github-pull-request-filter-webhook-events-sdk>`_ in the *AWS CodeBuild User Guide*.
