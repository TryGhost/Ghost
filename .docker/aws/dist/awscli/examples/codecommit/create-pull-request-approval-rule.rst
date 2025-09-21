**To create an approval rule for a pull request**

The following ``create-pull-request-approval-rule`` example creates an approval rule named  ``Require two approved approvers`` for the specified pull request. The rule specifies that two approvals are required from an approval pool. The pool includes all users who access CodeCommit by assuming the role of  ``CodeCommitReview`` in the ``123456789012`` AWS account. It also includes either an IAM user or federated user named ``Nikhil_Jayashankar`` from the same AWS account. ::

    aws codecommit create-pull-request-approval-rule  \
        --approval-rule-name "Require two approved approvers"  \
        --approval-rule-content "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"CodeCommitApprovers:123456789012:Nikhil_Jayashankar\", \"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}"

Output::

    {
        "approvalRule": {
            "approvalRuleName": "Require two approved approvers",
            "lastModifiedDate": 1570752871.932,
            "ruleContentSha256": "7c44e6ebEXAMPLE",
            "creationDate": 1570752871.932,
            "approvalRuleId": "aac33506-EXAMPLE",
            "approvalRuleContent": "{\"Version\": \"2018-11-08\",\"Statements\": [{\"Type\": \"Approvers\",\"NumberOfApprovalsNeeded\": 2,\"ApprovalPoolMembers\": [\"CodeCommitApprovers:123456789012:Nikhil_Jayashankar\", \"arn:aws:sts::123456789012:assumed-role/CodeCommitReview/*\"]}]}",
            "lastModifiedUser": "arn:aws:iam::123456789012:user/Mary_Major"
        }
    }

For more information, see `Create an Approval Rule  <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-pull-request-approval-rule.html#how-to-create-pull-request-approval-rule-cli>`__ in the *AWS CodeCommit User Guide*.
