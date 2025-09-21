**To update a canary**

The following ``update-canary`` example updates the configuration of a canary named ``demo_canary``. ::

    aws synthetics update-canary \
        --name demo_canary \
        --schedule Expression="rate(15 minutes)"

This command produces no output.

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.