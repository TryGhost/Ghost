**To return a list of the groups**

The following ``list-associated-groups`` example returns a list of the groups associated with the canary named ``demo_canary``. ::

    aws synthetics list-associated-groups \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary

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