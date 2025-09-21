**To view details of a comment**

This example demonstrates how to view details of a comment with the system-generated comment ID of ``ff30b348EXAMPLEb9aa670f``. ::

    aws codecommit get-comment \
        --comment-id ff30b348EXAMPLEb9aa670f

Output::

    {
        "comment": { 
            "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
            "clientRequestToken": "123Example",
            "commentId": "ff30b348EXAMPLEb9aa670f",
            "content": "Whoops - I meant to add this comment to the line, but I don't see how to delete it.",
            "creationDate": 1508369768.142,
            "deleted": false,
            "commentId": "",
            "lastModifiedDate": 1508369842.278,
            "callerReactions": [],
            "reactionCounts": 
            {
                "SMILE" : 6,
                "THUMBSUP" : 1
            }
        }
    }