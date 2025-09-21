**To list batch builds for a specific build project in AWS CodeBuild.**

The following ``list-build-batches-for-project`` example lists the CodeBuild batch builds for the specified project. ::

    aws codebuild list-build-batches-for-project \
        --project-name "<project-name>"

Output::

    {
        "ids": [
            "<project-name>:<batch-ID>",
            "<project-name>:<batch-ID>"
        ]
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

