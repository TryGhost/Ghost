**To apply an archive rule to existing findings that meet the archive rule criteria**

The following ``apply-archive-rule`` example applies an archive rule to existing findings that meet the archive rule criteria. ::

    aws accessanalyzer apply-archive-rule \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/UnusedAccess-ConsoleAnalyzer-organization \
        --rule-name MyArchiveRule 

This command produces no output.

For more information, see `Archive rules <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-archive-rules.html>`__ in the *AWS IAM User Guide*.