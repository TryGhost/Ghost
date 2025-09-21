**To update the name of an approval rule template**

The following ``update-approval-rule-template-name`` example changes the name of an approval rule template from ``1-approver-rule`` to `1-approver-rule-for-all-pull-requests``. ::

    aws codecommit update-approval-rule-template-name \
        --old-approval-rule-template-name 1-approver-rule  \
        --new-approval-rule-template-name 1-approver-rule-for-all-pull-requests 

Output::

    {
      "approvalRuleTemplate": {
        "approvalRuleTemplateName": "1-approver-rule-for-all-pull-requests",
        "lastModifiedDate": 1571358241.619,
        "approvalRuleTemplateId": "41de97b7-EXAMPLE",
        "approvalRuleTemplateContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 1,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
        "creationDate": 1571352720.773,
        "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
        "approvalRuleTemplateDescription": "All pull requests must be approved by one developer on the team.",
        "ruleContentSha256": "2f6c21a5cEXAMPLE"
      }
    }

For more information, see `Manage Approval Rule Templates <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html#update-template-description>`__ in the *AWS CodeCommit User Guide*.
