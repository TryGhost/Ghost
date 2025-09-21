**To change the description of a pull request**

This example demonstrates how to change the description of a pull request with the ID of ``47``. ::

    aws codecommit update-pull-request-description \
        --pull-request-id 47 \
        --description "Updated the pull request to remove unused global variable."

Output::

    {
        "pullRequest": { 
            "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
            "clientRequestToken": "",
            "creationDate": 1508530823.155,
            "description": "Updated the pull request to remove unused global variable.",
            "lastActivityDate": 1508372423.204,
            "pullRequestId": "47",
            "pullRequestStatus": "OPEN",
            "pullRequestTargets": [ 
                { 
                    "destinationCommit": "9f31c968EXAMPLE",
                    "destinationReference": "refs/heads/main",
                    "mergeMetadata": { 
                        "isMerged": false,
                    },
                    "repositoryName": "MyDemoRepo",
                    "sourceCommit": "99132ab0EXAMPLE",
                    "sourceReference": "refs/heads/variables-branch"
                }
            ],
            "title": "Consolidation of global variables"
        }
    }
