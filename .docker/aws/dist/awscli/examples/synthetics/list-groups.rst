**To return a list of all groups in the account**

The following ``list-groups`` example returns a list of all groups in the account. ::

    aws synthetics list-groups

Output::

    {
        "Groups": [
            {
                "Id": "example123",
                "Name": "demo_group",
                "Arn": "arn:aws:synthetics:us-east-1:123456789012:group:example123"
            }
        ]
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.