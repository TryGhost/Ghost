**To get telemetry onboarding status for the organization**

The following ``get-telemetry-evaluation-status-for-organization`` example returns the current onboarding status of the telemetry config feature for the organization. ::

    aws observabilityadmin get-telemetry-evaluation-status-for-organization

Output::

    {
        "Status": "RUNNING"
    }

For more information, see `Auditing CloudWatch telemetry configurations <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/telemetry-config-cloudwatch.html>`__ in the *Amazon CloudWatch User Guide*.