**Example 1: To remove a tag from the canary**

The following ``untag-resource`` example removes a tag from the canary named ``demo_canary``. ::

    aws synthetics untag-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary \
        --tag-keys blueprint

This command produces no output.

**Example 2: To remove a tag from the group**

The following ``untag-resource`` example assigns a removes a tag from the group named ``demo_group``. ::

    aws synthetics untag-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:group:example123 \
        --tag-keys team

This command produces no output.

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.