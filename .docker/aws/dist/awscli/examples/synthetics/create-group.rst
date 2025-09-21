**To create a group**

The following ``create-group`` example creates a group named ``demo_group``. ::

    aws synthetics create-group \
        --name demo_group

Output::

    {
        "Group": {
            "Id": "example123",
            "Name": "demo_group",
            "Arn": "arn:aws:synthetics:us-east-1:123456789012:group:example123",
            "Tags": {},
            "CreatedTime": "2024-10-15T14:47:23.811000+05:30",
            "LastModifiedTime": "2024-10-15T14:47:23.811000+05:30"
        }
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.