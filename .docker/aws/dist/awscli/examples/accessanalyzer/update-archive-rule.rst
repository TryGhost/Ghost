**To update the criteria and values for the specified archive rule**

The following ``update-archive-rule`` example updates the criteria and values for the specified archive rule in your AWS account. ::

    aws accessanalyzer update-archive-rule \
        --analyzer-name UnusedAccess-ConsoleAnalyzer-organization \
        --rule-name MyArchiveRule \
        --filter '{"resource": {"contains": ["Cognito"]}, "resourceType": {"eq": ["AWS::IAM::Role"]}}'

This command produces no output.

For more information, see `Archive rules <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-archive-rules.html>`__ in the *AWS IAM User Guide*.