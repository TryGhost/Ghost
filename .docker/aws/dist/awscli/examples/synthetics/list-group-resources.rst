**To return a list of the ARNs of the canaries that are associated with the specified group**

The following ``list-group-resources`` example returns a list of the ARNs of the canaries that are associated with the group named ``demo_group``. ::

    aws synthetics list-group-resources \
        --group-identifier demo_group

Output::

    {
        "Resources": [
            "arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary"
        ]
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.