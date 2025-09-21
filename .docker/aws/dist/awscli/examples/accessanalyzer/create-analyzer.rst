**To create an analyzer**

The following ``create-analyzer`` example creates an analyzer in your AWS account. ::

    aws accessanalyzer create-analyzer \
        --analyzer-name example \
        --type ACCOUNT

Output::

    {
        "arn": "arn:aws:access-analyzer:us-east-2:111122223333:analyzer/example"
    }

For more information, see `Getting started with AWS Identity and Access Management Access Analyzer findings <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-getting-started.html>`__ in the *AWS IAM User Guide*.