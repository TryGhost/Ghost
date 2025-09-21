**To get information about the override status of a pull request**

The following ``get-pull-request-override-state`` example returns the override state for the specified pull request. In this example, the approval rules for the pull request were overridden by a user named Mary Major, so the output returns a value of ``true``.::

    aws codecommit get-pull-request-override-state \
        --pull-request-id 34  \
        --revision-id 9f29d167EXAMPLE 

Output::

    {
        "overridden": true,
        "overrider": "arn:aws:iam::123456789012:user/Mary_Major"
    }

For more information, see `Override Approval Rules on a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-override-approval-rules.html#get-override-status>`__ in the *AWS CodeCommit User Guide*.
