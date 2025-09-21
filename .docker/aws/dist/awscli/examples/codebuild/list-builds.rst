**To get a list of AWS CodeBuild builds IDs.**

The following ``list-builds`` example gets a list of CodeBuild IDs sorted in ascending order. ::

    aws codebuild list-builds --sort-order ASCENDING

The output includes a ``nextToken`` value which indicates that there is more output available. ::

    {
        "nextToken": "4AEA6u7J...The full token has been omitted for brevity...MzY2OA==",
        "ids": [
            "codebuild-demo-project:815e755f-bade-4a7e-80f0-efe51EXAMPLE"
            "codebuild-demo-project:84a7f3d1-d40e-4956-b4cf-7a9d4EXAMPLE"
                ... The full list of build IDs has been omitted for brevity ...
            "codebuild-demo-project:931d0b72-bf6f-4040-a472-5c707EXAMPLE"
        ]
    }

Run this command again and provide the ``nextToken`` value in the previous response as a parameter to get the next part of the output. Repeat until you don't receive a ``nextToken`` value in the response. ::

    aws codebuild list-builds --sort-order ASCENDING --next-token 4AEA6u7J...The full token has been omitted for brevity...MzY2OA==

Next part of the output::

    {
        "ids": [       
            "codebuild-demo-project:49015049-21cf-4b50-9708-df115EXAMPLE",
            "codebuild-demo-project:543e7206-68a3-46d6-a4da-759abEXAMPLE",
                ... The full list of build IDs has been omitted for brevity ...
            "codebuild-demo-project:c282f198-4582-4b38-bdc0-26f96EXAMPLE"
        ]
    }

For more information, see `View a List of Build IDs (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/view-build-list.html>`_ in the *AWS CodeBuild User Guide*

