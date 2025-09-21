**To create an approval rule template**

The following ``create-approval-rule-template`` example creates an approval rule template named ``2-approver-rule-for-main ``. The template requires two users who assume the role of ``CodeCommitReview`` to approve any pull request before it can be merged to the ``main`` branch. ::

    aws codecommit create-approval-rule-template \
        --approval-rule-template-name 2-approver-rule-for-main \
        --approval-rule-template-description  "Requires two developers from the team to approve the pull request if the destination branch is main" \
        --approval-rule-template-content "{\"Version\": \"2018-11-08\",\"DestinationReferences\": [\"refs/heads/main\"],\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}"

Output::

    {
        "approvalRuleTemplate": {
            "approvalRuleTemplateName": "2-approver-rule-for-main",
            "creationDate": 1571356106.936,
            "approvalRuleTemplateId": "dd8b17fe-EXAMPLE",
            "approvalRuleTemplateContent": "{\"Version\": \"2018-11-08\",\"DestinationReferences\": [\"refs/heads/main\"],\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
            "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major",
            "approvalRuleTemplateDescription": "Requires two developers from the team to approve the pull request if the destination branch is main",
            "lastModifiedDate": 1571356106.936,
            "ruleContentSha256": "4711b576EXAMPLE"
        }
    }

For more information, see `Create an Approval Rule Template <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-template.html#create-template-cli>`__ in the *AWS CodeCommit User Guide*.