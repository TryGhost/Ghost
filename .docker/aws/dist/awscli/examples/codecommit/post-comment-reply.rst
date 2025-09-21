**To reply to a comment on a commit or in a pull request**

This example demonstrates how to add the reply ``"Good catch. I'll remove them."`` to the comment with the system-generated ID of ``abcd1234EXAMPLEb5678efgh``. ::

    aws codecommit post-comment-reply \
        --in-reply-to abcd1234EXAMPLEb5678efgh \
        --content "Good catch. I'll remove them." \
        --client-request-token 123Example

Output::

    {
        "comment": {
            "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
            "clientRequestToken": "123Example",
            "commentId": "442b498bEXAMPLE5756813",
            "content": "Good catch. I'll remove them.",
            "creationDate": 1508369829.136,
            "deleted": false,
            "CommentId": "abcd1234EXAMPLEb5678efgh",
            "lastModifiedDate": 150836912.221,
            "callerReactions": [],
            "reactionCounts": []
        }
    }