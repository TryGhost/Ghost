**To create a pull request**

The following ``create-pull-request`` example creates a pull request named 'Pronunciation difficulty analyzer' with a description of 'Please review these changes by Tuesday' that targets the 'jane-branch' source branch and is to be merged to the default branch 'main' in an AWS CodeCommit repository named 'MyDemoRepo'. ::

    aws codecommit create-pull-request \
        --title "My Pull Request" \
        --description "Please review these changes by Tuesday" \
        --client-request-token 123Example \
        --targets repositoryName=MyDemoRepo,sourceReference=MyNewBranch 

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
                        "approvalRuleTemplateId": "dd3d22fe-EXAMPLE",
                        "approvalRuleTemplateName": "2-approver-rule-for-main"
                    },
                    "ruleContentSha256": "4711b576EXAMPLE"
                }
            ],
            "authorArn": "arn:aws:iam::111111111111:user/Jane_Doe",
            "description": "Please review these changes by Tuesday",
            "title": "Pronunciation difficulty analyzer",
            "pullRequestTargets": [
                {
                    "destinationCommit": "5d036259EXAMPLE",
                    "destinationReference": "refs/heads/main",
                    "repositoryName": "MyDemoRepo",
                    "sourceCommit": "317f8570EXAMPLE",
                    "sourceReference": "refs/heads/jane-branch",
                    "mergeMetadata": {
                        "isMerged": false
                    }
                }
            ],
            "lastActivityDate": 1508962823.285,
            "pullRequestId": "42",
            "clientRequestToken": "123Example",
            "pullRequestStatus": "OPEN",
            "creationDate": 1508962823.285
        }
    }
