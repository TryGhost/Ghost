**To add a comment to a pull request**

The following ``post-comment-for-pull-request`` example adds the comment "These don't appear to be used anywhere. Can we remove them?" on the change to the ``ahs_count.py`` file in a pull request with the ID of ``47`` in a repository named ``MyDemoRepo``. ::

    aws codecommit post-comment-for-pull-request \
        --pull-request-id "47" \
        --repository-name MyDemoRepo \
        --before-commit-id 317f8570EXAMPLE \
        --after-commit-id 5d036259EXAMPLE \
        --client-request-token 123Example \
        --content "These don't appear to be used anywhere. Can we remove them?" \
        --location filePath=ahs_count.py,filePosition=367,relativeFileVersion=AFTER

Output::

    {
         "afterBlobId": "1f330709EXAMPLE",
         "afterCommitId": "5d036259EXAMPLE",
         "beforeBlobId": "80906a4cEXAMPLE",
         "beforeCommitId": "317f8570EXAMPLE",
         "comment": {
                "authorArn": "arn:aws:iam::111111111111:user/Saanvi_Sarkar",
                "clientRequestToken": "123Example",
                "commentId": "abcd1234EXAMPLEb5678efgh",
                "content": "These don't appear to be used anywhere. Can we remove them?",
                "creationDate": 1508369622.123,
                "deleted": false,
                "CommentId": "",
                "lastModifiedDate": 1508369622.123,
                "callerReactions": [],
                "reactionCounts": []
            },
            "location": { 
                "filePath": "ahs_count.py",
                "filePosition": 367,
                "relativeFileVersion": "AFTER"
             },
         "repositoryName": "MyDemoRepo",
         "pullRequestId": "47"
    }
