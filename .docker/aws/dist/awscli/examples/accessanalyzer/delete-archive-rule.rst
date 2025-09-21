**To delete the specified archive rule**

The following ``delete-archive-rule`` example deletes the specified archive rule in your AWS account. ::

    aws accessanalyzer delete-archive-rule \
        --analyzer-name UnusedAccess-ConsoleAnalyzer-organization \
        --rule-name MyRule

This command produces no output.

For more information, see `Archive rules <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-archive-rules.html>`__ in the *AWS IAM User Guide*.