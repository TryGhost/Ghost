**To remove a canary from a group**

The following ``disassociate-resource`` example removes a canary from the group named ``demo_group``. ::

    aws synthetics disassociate-resource \
        --group-identifier demo_group \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary

This command produces no output.

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.