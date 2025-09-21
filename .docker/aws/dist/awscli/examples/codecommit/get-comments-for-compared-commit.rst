**To view comments on a commit**

This example demonstrates how to view view comments made on the comparison between two commits in a repository named ``MyDemoRepo``. ::

    aws codecommit get-comments-for-compared-commit \
        --repository-name MyDemoRepo \
        --before-commit-ID 6e147360EXAMPLE \
        --after-commit-id 317f8570EXAMPLE

Output::

    {
        "commentsForComparedCommitData": [ 
            { 
                "afterBlobId": "1f330709EXAMPLE",
                "afterCommitId": "317f8570EXAMPLE",
                "beforeBlobId": "80906a4cEXAMPLE",
                "beforeCommitId": "6e147360EXAMPLE",
                "comments": [ 
                    { 
                        "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
                        "clientRequestToken": "123Example",
                        "commentId": "ff30b348EXAMPLEb9aa670f",
                        "content": "Whoops - I meant to add this comment to the line, not the file, but I don't see how to delete it.",
                        "creationDate": 1508369768.142,
                        "deleted": false,
                        "CommentId": "123abc-EXAMPLE",
                        "lastModifiedDate": 1508369842.278,
                        "callerReactions": [],
                        "reactionCounts": 
                        {
                            "SMILE" : 6,
                            "THUMBSUP" : 1
                        }
                    },
                    {
                        "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
                        "clientRequestToken": "123Example",
                        "commentId": "553b509bEXAMPLE56198325",
                        "content": "Can you add a test case for this?",
                        "creationDate": 1508369612.240,
                        "deleted": false,
                        "commentId": "456def-EXAMPLE",
                        "lastModifiedDate": 1508369612.240,
                        "callerReactions": [],
                        "reactionCounts": 
                        {
                            "THUMBSUP" : 2
                        }
                    }
                ],
                "location": { 
                    "filePath": "cl_sample.js",
                    "filePosition": 1232,
                    "relativeFileVersion": "after"
                },
                "repositoryName": "MyDemoRepo"
            }
        ],
        "nextToken": "exampleToken"
    }