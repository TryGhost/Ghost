**To add a tag to the specified resource**

The following ``tag-resource`` example adds a tag to the specified resource in your AWS account. ::

    aws accessanalyzer tag-resource \
        --resource-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --tags Environment=dev,Purpose=testing

This command produces no output.

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.