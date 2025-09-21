**To override approval rule requirements on a pull request**

The following ``override-pull-request-approval-rules`` example overrides approval rules on the specified pull request. To revoke an override instead, set the ``--override-status`` parameter value to ``REVOKE``. ::

    aws codecommit override-pull-request-approval-rules \
        --pull-request-id 34  \
        --revision-id 927df8d8EXAMPLE \
        --override-status OVERRIDE

This command produces no output.

For more information, see `Override Approval Rules on a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-override-approval-rules.html#override-approval-rules>`__ in the *AWS CodeCommit User Guide*.
