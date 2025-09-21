**To view comments for a pull request**

This example demonstrates how to view comments for a pull request in a repository named ``MyDemoRepo``. ::

    aws codecommit get-comments-for-pull-request \
        --repository-name MyDemoRepo \
        --before-commit-ID 317f8570EXAMPLE \
        --after-commit-id 5d036259EXAMPLE

Output::

    {
        "commentsForPullRequestData": [ 
            { 
                "afterBlobId": "1f330709EXAMPLE",
                "afterCommitId": "5d036259EXAMPLE",
                "beforeBlobId": "80906a4cEXAMPLE",
                "beforeCommitId": "317f8570EXAMPLE",
                "comments": [ 
                    { 
                        "authorArn": "arn:aws:iam::111111111111:user/Saanvi_Sarkar",
                        "clientRequestToken": "",
                        "commentId": "abcd1234EXAMPLEb5678efgh",
                        "content": "These don't appear to be used anywhere. Can we remove them?",
                        "creationDate": 1508369622.123,
                        "deleted": false,
                        "lastModifiedDate": 1508369622.123,
                        "callerReactions": [],
                        "reactionCounts": 
                        {
                            "THUMBSUP" : 6,
                            "CONFUSED" : 1
                        }
                    },
                    {
                        "authorArn": "arn:aws:iam::111111111111:user/Li_Juan",
                        "clientRequestToken": "",
                        "commentId": "442b498bEXAMPLE5756813",
                        "content": "Good catch. I'll remove them.",
                        "creationDate": 1508369829.104,
                        "deleted": false,
                        "lastModifiedDate": 150836912.273,
                        "callerReactions": ["THUMBSUP"]
                        "reactionCounts": 
                        {
                            "THUMBSUP" : 14
                        }
                    }
                ],
                "location": { 
                    "filePath": "ahs_count.py",
                    "filePosition": 367,
                    "relativeFileVersion": "AFTER"
                },
                "repositoryName": "MyDemoRepo",
                "pullRequestId": "42"
            }
        ],
        "nextToken": "exampleToken"
    }
