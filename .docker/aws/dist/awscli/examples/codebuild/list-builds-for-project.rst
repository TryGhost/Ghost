**To view a list of builds for an AWS CodeBuild build project.**

The following ``list-builds-for-project`` example lists the build IDs in descending order for the specified CodeBuild build project. ::

    aws codebuild list-builds-for-project --project-name codebuild-demo-project --sort-order DESCENDING

Output::

    {
        "ids": [
            "codebuild-demo-project:1a2b3c4d-5678-90ab-cdef-11111example",
            "codebuild-demo-project:1a2b3c4d-5678-90ab-cdef-22222example",
            "codebuild-demo-project:1a2b3c4d-5678-90ab-cdef-33333example",
            "codebuild-demo-project:1a2b3c4d-5678-90ab-cdef-44444example",
            "codebuild-demo-project:1a2b3c4d-5678-90ab-cdef-55555example"
        ]
    }

For more information, see `View a List of Build IDs for a Build Project (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/view-builds-for-project.html#view-builds-for-project-cli>`_ in the *AWS CodeBuild User Guide*
