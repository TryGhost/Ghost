**To reset the cache for an AWS CodeBuild build project.**

The following ``invalidate-project-cache`` example resets the cache for the specified CodeBuild project. ::

    aws codebuild invalidate-project-cache --project-name my-project

This command produces no output.

For more information, see `Build Caching in CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/build-caching.html>`_ in the *AWS CodeBuild User Guide*.
