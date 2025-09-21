**Example 1: To assign a tag to the canary**

The following ``tag-resource`` example assigns a tag to the canary named ``demo_canary``. ::

    aws synthetics tag-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary \
        --tags blueprint=heartbeat

This command produces no output.

**Example 2: To assign a tag to the group**

The following ``tag-resource`` example assigns a tag to the group named ``demo_group``. ::

    aws synthetics tag-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:group:example123 \
        --tags team=Devops

This command produces no output.

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.