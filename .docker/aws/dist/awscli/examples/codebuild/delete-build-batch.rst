**To delete a batch build in AWS CodeBuild.**

The following ``delete-build-batch`` example deletes the specified batch build. ::

    aws codebuild delete-build-batch \
        --id <project-name>:<batch-ID>

Output::

    {
        "statusCode": "BATCH_DELETED",
        "buildsDeleted": [
            "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
            "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
            "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
            "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>"
        ],
        "buildsNotDeleted": []
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

