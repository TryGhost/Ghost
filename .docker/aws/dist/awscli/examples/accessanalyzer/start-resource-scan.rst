**To immediately start a scan of the policies applied to the specified resource**

The following ``start-resource-scan`` example mmediately starts a scan of the policies applied to the specified resource in your AWS account. ::

    aws accessanalyzer start-resource-scan \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --resource-arn arn:aws:iam::111122223333:role/Cognito_testpoolAuth_Role

This command produces no output.

For more information, see `IAM Access Analyzer policy generation <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html>`__ in the *AWS IAM User Guide*.