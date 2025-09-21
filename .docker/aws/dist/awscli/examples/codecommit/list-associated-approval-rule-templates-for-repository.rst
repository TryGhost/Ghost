**To list all templates associated with a repository**

The following ``list-associated-approval-rule-templates-for-repository`` example lists all approval rule templates associated with a repository named ``MyDemoRepo``. ::

    aws codecommit list-associated-approval-rule-templates-for-repository \
        --repository-name MyDemoRepo

Output::

    {
      "approvalRuleTemplateNames": [
        "2-approver-rule-for-main",
        "1-approver-rule-for-all-pull-requests"
      ]
    }

For more information, see `Manage Approval Rule Templates <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html#list-associated-templates>`__ in the *AWS CodeCommit User Guide*.