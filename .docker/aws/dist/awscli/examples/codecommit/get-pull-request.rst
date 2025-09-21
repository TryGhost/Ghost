**To view details of a pull request**

This example demonstrates how to view information about a pull request with the ID of ``27``. ::

    aws codecommit get-pull-request \
        --pull-request-id 27

Output::

    {
        "pullRequest": {
            "approvalRules": [
                {
                    "approvalRuleContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
                    "approvalRuleId": "dd8b17fe-EXAMPLE",
                    "approvalRuleName": "2-approver-rule-for-main",
                    "creationDate": 1571356106.936,
                    "lastModifiedDate": 571356106.936,
                    "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
                    "ruleContentSha256": "4711b576EXAMPLE"
                }
            ],
            "lastActivityDate": 1562619583.565,
            "pullRequestTargets": [
                {
                    "sourceCommit": "ca45e279EXAMPLE",
                    "sourceReference": "refs/heads/bugfix-1234",
                    "mergeBase": "a99f5ddbEXAMPLE",
                    "destinationReference": "refs/heads/main",
                    "mergeMetadata": {
                        "isMerged": false
                    },
                    "destinationCommit": "2abfc6beEXAMPLE",
                    "repositoryName": "MyDemoRepo"
                }
            ],
            "revisionId": "e47def21EXAMPLE",
            "title": "Quick fix for bug 1234",
            "authorArn": "arn:aws:iam::123456789012:user/Nikhil_Jayashankar",
            "clientRequestToken": "d8d7612e-EXAMPLE",
            "creationDate": 1562619583.565,
            "pullRequestId": "27",
            "pullRequestStatus": "OPEN"
        }
    }