**To edit an approval rule for a pull request**

The following ``update-pull-request-approval-rule-content`` example updates she specified approval rule to require one user approval from an approval pool that includes any IAM user in the ``123456789012`` AWS account. ::

    aws codecommit update-pull-request-approval-rule-content \
        --pull-request-id 27  \
        --approval-rule-name "Require two approved approvers" \
        --approval-rule-content "{Version: 2018-11-08, Statements: [{Type: \"Approvers\", NumberOfApprovalsNeeded: 1, ApprovalPoolMembers:[\"CodeCommitApprovers:123456789012:user/*\"]}]}}" 

Output::

    {
        "approvalRule": {
            "approvalRuleContent": "{Version: 2018-11-08, Statements: [{Type: \"Approvers\", NumberOfApprovalsNeeded: 1, ApprovalPoolMembers:[\"CodeCommitApprovers:123456789012:user/*\"]}]}}",
            "approvalRuleId": "aac33506-EXAMPLE",
            "originApprovalRuleTemplate": {},
            "creationDate": 1570752871.932,
            "lastModifiedDate": 1570754058.333,
            "approvalRuleName": Require two approved approvers",
            "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
            "ruleContentSha256": "cd93921cEXAMPLE",
        }
    }

For more information, see `Edit or Delete an Approval Rule <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-edit-delete-pull-request-approval-rule.html#update-pull-request-approval-rule-content>`__ in the *AWS CodeCommit User Guide*.