**To return a list of available standards**

The following ``describe-standards`` example returns the list of available standards. ::

    aws securityhub describe-standards

Output::

    {
        "Standards": [
            {
                "StandardsArn": "arn:aws:securityhub:us-west-1::standards/aws-foundational-security-best-practices/v/1.0.0",
                "Name": "AWS Foundational Security Best Practices v1.0.0",
                "Description": "The AWS Foundational Security Best Practices standard is a set of automated security checks that detect when AWS accounts and deployed resources do not align to security best practices. The standard is defined by AWS security experts. This curated set of controls helps improve your security posture in AWS, and cover AWS's most popular and foundational services.",
                "EnabledByDefault": true
            },
            {
                "StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0",
                "Name": "CIS AWS Foundations Benchmark v1.2.0",
                "Description": "The Center for Internet Security (CIS) AWS Foundations Benchmark v1.2.0 is a set of security configuration best practices for AWS. This Security Hub standard automatically checks for your compliance readiness against a subset of CIS requirements.",
                "EnabledByDefault": true
            },
            {
                "StandardsArn": "arn:aws:securityhub:us-west-1::standards/pci-dss/v/3.2.1",
                "Name": "PCI DSS v3.2.1",
                "Description": "The Payment Card Industry Data Security Standard (PCI DSS) v3.2.1 is an information security standard for entities that store, process, and/or transmit cardholder data. This Security Hub standard automatically checks for your compliance readiness against a subset of PCI DSS requirements.",
                "EnabledByDefault": false
            }
        ]
    }

For more information, see `Security standards in AWS Security Hub <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html>`__ in the *AWS Security Hub User Guide*.
