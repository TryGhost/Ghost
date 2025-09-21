**To remove tags from the specified resources**

The following ``untag-resource`` example removes tags from the specified resource in your AWS account. ::

    aws accessanalyzer untag-resource \
        --resource-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --tag-keys Environment Purpose

This command produces no output.

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.