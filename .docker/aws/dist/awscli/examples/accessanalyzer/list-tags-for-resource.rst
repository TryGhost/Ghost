**To retrieve a list of tags applied to the specified resource**

The following ``list-tags-for-resource`` example retrieves a list of tags applied to the specified resource in your AWS account. ::

    aws accessanalyzer list-tags-for-resource \
        --resource-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account

Output::

    {
        "tags": {
            "Zone-of-trust": "Account",
            "Name": "ConsoleAnalyzer"
        }
    }

For more information, see `IAM Access Analyzer policy generation <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html>`__ in the *AWS IAM User Guide*.