**To get the content of an approval rule template**

The following ``get-approval-rule-template`` example gets the content of an approval rule template named ``1-approver-rule-for-all-pull-requests``. ::

    aws codecommit get-approval-rule-template \
        --approval-rule-template-name 1-approver-rule-for-all-pull-requests 

Output::

    {
        "approvalRuleTemplate": {
            "approvalRuleTemplateContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 1,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
            "ruleContentSha256": "621181bbEXAMPLE",
            "lastModifiedDate": 1571356106.936,
            "creationDate": 1571356106.936,
            "approvalRuleTemplateName": "1-approver-rule-for-all-pull-requests",
            "lastModifiedUser": "arn:aws:iam::123456789012:user/Li_Juan",
            "approvalRuleTemplateId": "a29abb15-EXAMPLE",
            "approvalRuleTemplateDescription": "All pull requests must be approved by one developer on the team."
        }
    }


For more information, see `Manage Approval Rule Templates <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html#get-template>`__ in the *AWS CodeCommit User Guide*.
