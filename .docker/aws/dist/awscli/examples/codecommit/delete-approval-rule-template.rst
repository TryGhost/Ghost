**To delete an approval rule template**

The following ``delete-approval-rule-template`` example deletes the specified approval rule template. ::

    aws codecommit delete-approval-rule-template  \
        --approval-rule-template-name 1-approver-for-all-pull-requests 

Output::

    {
        "approvalRuleTemplateId": "41de97b7-EXAMPLE"
    }

For more information, see `Delete an Approval Rule Template  <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-delete-template.html#delete-template>`__ in the *AWS CodeCommit User Guide*.
