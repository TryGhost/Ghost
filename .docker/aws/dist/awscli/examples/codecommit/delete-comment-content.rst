**To delete the content of a comment**

You can only delete the content of a comment if you created the comment. This example demonstrates how to delete the content of a comment with the system-generated ID of ``ff30b348EXAMPLEb9aa670f``. ::

    aws codecommit delete-comment-content \
        --comment-id ff30b348EXAMPLEb9aa670f

Output::

    {
        "comment": { 
            "creationDate": 1508369768.142,  
            "deleted": true,
            "lastModifiedDate": 1508369842.278,
            "clientRequestToken": "123Example",
            "commentId": "ff30b348EXAMPLEb9aa670f",
            "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
            "callerReactions": [],
            "reactionCounts": 
            {
                "CLAP" : 1
            }
        } 
    }