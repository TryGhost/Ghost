**To get a list of AWS CodeBuild build project names.**

The following ``list-projects`` example gets a list of CodeBuild build projects sorted by name in ascending order. ::

    aws codebuild list-projects --sort-by NAME --sort-order ASCENDING 

The output includes a ``nextToken`` value which indicates that there is more output available. ::

    {
        "nextToken": "Ci33ACF6...The full token has been omitted for brevity...U+AkMx8=",
        "projects": [
            "codebuild-demo-project",
            "codebuild-demo-project2",
                ... The full list of build project names has been omitted for brevity ...
            "codebuild-demo-project99"
        ]
    }

Run this command again and provide the ``nextToken`` value from the previous response as a parameter to get the next part of the output. Repeat until you don't receive a ``nextToken`` value in the response. ::

    aws codebuild list-projects  --sort-by NAME --sort-order ASCENDING --next-token Ci33ACF6...The full token has been omitted for brevity...U+AkMx8=

    {
        "projects": [
            "codebuild-demo-project100",
            "codebuild-demo-project101",
                ... The full list of build project names has been omitted for brevity ...
            "codebuild-demo-project122"
        ]
    }

For more information, see `View a List of Build Project Names (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/view-project-list.html#view-project-list-cli>`_ in the *AWS CodeBuild User Guide*.

