**To list batch builds in AWS CodeBuild.**

The following ``list-build-batches`` example lists the CodeBuild batch builds for the current account. ::

    aws codebuild list-build-batches

Output::

    {
        "ids": [
            "<project-name>:<batch-ID>",
            "<project-name>:<batch-ID>"
        ]
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`)__ in the *AWS CodeBuild User Guide*.

