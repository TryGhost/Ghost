**To delete an approval rule for a pull request**

The following ``delete-pull-request-approval-rule`` example deletes the approval rule named  ``My Approval Rule`` for the specified pull request. ::

    aws codecommit delete-pull-request-approval-rule  \
        --approval-rule-name "My Approval Rule"  \
        --pull-request-id 15

Output::

    {
        "approvalRuleId": "077d8e8a8-EXAMPLE"
    }

For more information, see `Edit or Delete an Approval Rule  <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-edit-delete-pull-request-approval-rule.html#delete-pull-request-approval-rule>`__ in the *AWS CodeCommit User Guide*.
