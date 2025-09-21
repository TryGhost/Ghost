**To get telemetry onboarding status for the account**

The following ``get-telemetry-evaluation-status`` example returns the current onboarding status of the telemetry config feature in the specified account. ::

    aws observabilityadmin get-telemetry-evaluation-status 

Output::

    {
        "Status": "RUNNING"
    }

For more information, see `Auditing CloudWatch telemetry configurations <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/telemetry-config-cloudwatch.html>`__ in the *Amazon CloudWatch User Guide*.