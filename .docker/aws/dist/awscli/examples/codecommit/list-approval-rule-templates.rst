**To list all approval rule templates in an AWS Region**

The following ``list-approval-rule-templates`` example lists all approval rule templates in the specified Region. If no AWS Region is specified as a parameter, the command returns approval rule templates for the region specified in the AWS CLI profile used to run the command. ::

    aws codecommit list-approval-rule-templates \
        --region us-east-2

Output::

    {
        "approvalRuleTemplateNames": [
            "2-approver-rule-for-main",
            "1-approver-rule-for-all-pull-requests"
        ]
    }

For more information, see `Manage Approval Rule Templates <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html#list-templates>`__ in the *AWS CodeCommit User Guide*.