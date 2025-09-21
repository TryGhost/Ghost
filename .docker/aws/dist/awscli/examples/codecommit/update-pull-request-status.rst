**To change the status of a pull request**

This example demonstrates how to to change the status of a pull request with the ID of ``42`` to a status of ``CLOSED`` in an AWS CodeCommit repository named ``MyDemoRepo``. ::

    aws codecommit update-pull-request-status \
        --pull-request-id 42 \
        --pull-request-status CLOSED

Output::

    {
        "pullRequest": {
            "approvalRules": [
                {
                    "approvalRuleContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
                    "approvalRuleId": "dd8b17fe-EXAMPLE",
                    "approvalRuleName": "2-approvers-needed-for-this-change",
                    "creationDate": 1571356106.936,
                    "lastModifiedDate": 571356106.936,
                    "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
                    "ruleContentSha256": "4711b576EXAMPLE"
                }
            ],
            "authorArn": "arn:aws:iam::123456789012:user/Li_Juan",
            "clientRequestToken": "",
            "creationDate": 1508530823.165,
            "description": "Updated the pull request to remove unused global variable.",
            "lastActivityDate": 1508372423.12,
            "pullRequestId": "47",
            "pullRequestStatus": "CLOSED",
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
