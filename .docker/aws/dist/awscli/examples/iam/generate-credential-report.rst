**To generate a credential report**

The following example attempts to generate a credential report for the AWS account. ::

    aws iam generate-credential-report

Output::

    {
        "State":  "STARTED",
        "Description": "No report exists. Starting a new report generation task"
    }

For more information, see `Getting credential reports for your AWS account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html>`__ in the *AWS IAM User Guide*.