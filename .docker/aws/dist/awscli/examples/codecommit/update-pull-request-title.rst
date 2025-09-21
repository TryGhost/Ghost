**To change the title of a pull request**

This example demonstrates how to change the title of a pull request with the ID of ``47``. ::

    aws codecommit update-pull-request-title \
        --pull-request-id 47 \
        --title "Consolidation of global variables - updated review"

Output::

    {
        "pullRequest": {
            "approvalRules": [
                {
                    "approvalRuleContent": "{\"Version\": \"2018-11-08\",\"DestinationReferences\": [\"refs/heads/main\"],\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
                    "approvalRuleId": "dd8b17fe-EXAMPLE",
                    "approvalRuleName": "2-approver-rule-for-main",
                    "creationDate": 1571356106.936,
                    "lastModifiedDate": 571356106.936,
                    "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
                    "originApprovalRuleTemplate": {
                        "approvalRuleTemplateId": "dd8b26gr-EXAMPLE",
                        "approvalRuleTemplateName": "2-approver-rule-for-main"
                    },
                    "ruleContentSha256": "4711b576EXAMPLE"
                }
            ],
            "authorArn": "arn:aws:iam::123456789012:user/Li_Juan",
            "clientRequestToken": "",
            "creationDate": 1508530823.12,
            "description": "Review the latest changes and updates to the global variables. I have updated this request with some changes, including removing some unused variables.",
            "lastActivityDate": 1508372657.188,
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
            "title": "Consolidation of global variables - updated review"
        }
    }
