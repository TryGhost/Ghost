**To approve or revoke approval for a pull request**

The following ``update-pull-request-approval-state`` example approves a pull request with the ID of ``27`` and a revision ID of ``9f29d167EXAMPLE``.  If you wanted to revoke approval instead, then set the ``--approval-state`` parameter value to ``REVOKE``. :: 

    aws codecommit update-pull-request-approval-state \
        --pull-request-id 27  \
        --revision-id 9f29d167EXAMPLE  \
        --approval-state "APPROVE"

This command produces no output.

For more information, see `Review a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-review-pull-request.html#update-pull-request-approval-state>`__ in the *AWS CodeCommit User Guide*.
