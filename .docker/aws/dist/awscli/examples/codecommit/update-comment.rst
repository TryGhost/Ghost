**To update a comment on a commit**

This example demonstrates how to add the content ``"Fixed as requested. I'll update the pull request."`` to a comment with an ID of ``442b498bEXAMPLE5756813``. ::

    aws codecommit update-comment \
        --comment-id 442b498bEXAMPLE5756813 \
        --content "Fixed as requested. I'll update the pull request."

Output::

    {
        "comment": {
            "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
            "clientRequestToken": "",
            "commentId": "442b498bEXAMPLE5756813",
            "content": "Fixed as requested. I'll update the pull request.",
            "creationDate": 1508369929.783,
            "deleted": false,
            "lastModifiedDate": 1508369929.287,
            "callerReactions": [],
            "reactionCounts": 
                {
                    "THUMBSUP" : 2
                }
        }
    }