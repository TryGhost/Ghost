**To update the content of an approval rule template**

The following ``update-approval-rule-template-content`` example changes the content of the specified approval rule template to redefine the approval pool to users who assume the role of ``CodeCommitReview``. ::

    aws codecommit update-approval-rule-template-content \
        --approval-rule-template-name 1-approver-rule  \
        --new-rule-content "{\"Version\": \"2018-11-08\",\"DestinationReferences\": [\"refs/heads/main\"],\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}"

Output::

    {
        "approvalRuleTemplate": {
            "creationDate": 1571352720.773,
            "approvalRuleTemplateDescription": "Requires 1 approval for all pull requests from the CodeCommitReview pool",
            "lastModifiedDate": 1571358728.41,
            "approvalRuleTemplateId": "41de97b7-EXAMPLE",
            "approvalRuleTemplateContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 1,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
            "approvalRuleTemplateName": "1-approver-rule-for-all-pull-requests",
            "ruleContentSha256": "2f6c21a5EXAMPLE",
            "lastModifiedUser": "arn:aws:iam::123456789012:user/Li_Juan"
        }
    }

For more information, see `Manage Approval Rule Templates <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html#update-template-content>`__ in the *AWS CodeCommit User Guide*.
