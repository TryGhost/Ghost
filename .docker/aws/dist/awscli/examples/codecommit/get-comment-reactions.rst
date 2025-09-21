**To view emoji reactions to a comment**

The following ``get-comment-reactions`` example lists all emoji reactions to a comment with the ID of ``abcd1234EXAMPLEb5678efgh``. If the font for your shell supports displaying Emoji Version 1.0, then in the output for ``emoji`` the emoji is displayed. ::

    aws codecommit get-comment-reactions \
        --comment-id abcd1234EXAMPLEb5678efgh

Output::

    {
        "reactionsForComment": {
            [
               {
                   "reaction": {
                        "emoji:"??",
                        "shortCode": "thumbsup",
                        "unicode": "U+1F44D"
                    },
                    "users": [
                        "arn:aws:iam::123456789012:user/Li_Juan",
                        "arn:aws:iam::123456789012:user/Mary_Major",
                        "arn:aws:iam::123456789012:user/Jorge_Souza"
                    ]
                },
                {
                    "reaction": {
                        "emoji": "??",
                        "shortCode": "thumbsdown",
                        "unicode": "U+1F44E"
                    },
                    "users": [
                        "arn:aws:iam::123456789012:user/Nikhil_Jayashankar"
                    ]
                },
                {
                    "reaction": {
                        "emoji": "??",
                        "shortCode": "confused",
                        "unicode": "U+1F615"
                    },
                    "users": [
                        "arn:aws:iam::123456789012:user/Saanvi_Sarkar"
                    ]
                }
            ]
        }
    }

For more information, see `Comment on a commit in AWS CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-commit-comment.html#how-to-commit-comment-cli-commit-emoji-view>`__ in the *AWS CodeCommit User Guide*.
