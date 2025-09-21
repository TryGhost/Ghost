**To get a credential report**

This example opens the returned report and outputs it to the pipeline as an array of text lines. ::

    aws iam get-credential-report

Output::

    {
        "GeneratedTime":  "2015-06-17T19:11:50Z",
        "ReportFormat": "text/csv"
    }

For more information, see `Getting credential reports for your AWS account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html>`__ in the *AWS IAM User Guide*.