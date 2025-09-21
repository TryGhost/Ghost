**To delete builds in AWS CodeBuild.**

The following ``batch-delete-builds`` example deletes builds in CodeBuild with the specified IDs. ::

    aws codebuild batch-delete-builds --ids my-build-project-one:a1b2c3d4-5678-9012-abcd-11111EXAMPLE my-build-project-two:a1b2c3d4-5678-9012-abcd-22222EXAMPLE

Output::

    {
        "buildsNotDeleted": [
            {
                "id": "arn:aws:codebuild:us-west-2:123456789012:build/my-build-project-one:a1b2c3d4-5678-9012-abcd-11111EXAMPLE", 
                "statusCode": "BUILD_IN_PROGRESS"
            }
        ], 
        "buildsDeleted": [
            "arn:aws:codebuild:us-west-2:123456789012:build/my-build-project-two:a1b2c3d4-5678-9012-abcd-22222EXAMPLE"
        ]
    }

For more information, see `Delete Builds (AWS CLI)  <https://docs.aws.amazon.com/codebuild/latest/userguide/delete-builds.html#delete-builds-cli>`_ in the *AWS CodeBuild User Guide*.

