**Example 1: To display the tags associated with a canary**

The following ``list-tags-for-resource`` example returns the tags associated with a canary named ``demo_canary``. ::

    aws synthetics list-tags-for-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:canary:demo_canary

Output::

    {
        "Tags": {
            "blueprint": "heartbeat"
        }
    }

**Example 2: To display the tags associated with a group**

The following ``list-tags-for-resource`` example returns the tags associated with a group named ``demo_group``. ::

    aws  synthetics list-tags-for-resource \
        --resource-arn arn:aws:synthetics:us-east-1:123456789012:group:example123

Output::

    {
        "Tags": {
            "team": "Devops"
        }
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.