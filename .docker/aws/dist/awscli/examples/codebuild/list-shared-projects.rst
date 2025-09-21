**To list the shared project in AWS CodeBuild.**

The following ``list-shared-projects`` example lists the CodeBuild shared projects that are available to the current account. ::

    aws codebuild list-shared-projects

Output::

    {
        "projects": [
            "arn:aws:codebuild:<region-ID>:<account-ID>:project/<shared-project-name-1>",
            "arn:aws:codebuild:<region-ID>:<account-ID>:project/<shared-project-name-2>"
        ]
    }

For more information, see `Working with shared projects  <https://docs.aws.amazon.com/codebuild/latest/userguide/project-sharing.html>`__ in the *AWS CodeBuild User Guide*.
