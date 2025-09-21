**To reply to a comment on a commit with an emoji**

The following ``put-comment-reaction`` example replies to a comment with the ID of ``abcd1234EXAMPLEb5678efgh`` with an emoji reaction value of ``:thumbsup:``. ::

    aws codecommit put-comment-reaction \
        --comment-id abcd1234EXAMPLEb5678efgh \
        --reaction-value :thumbsup:

This command produces no output.

For more information, see `Comment on a commit in AWS CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-commit-comment.html#how-to-commit-comment-cli-commit-reply-emoji>`__ in the *AWS CodeCommit User Guide*.
