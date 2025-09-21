**To retrieve a list of runs for a specified canary**

The following ``get-canary-runs`` example retrieves a list of runs for the canary named ``demo_canary``. ::

    aws synthetics get-canary-runs \
        --name demo_canary

Output::

    {
        "CanaryRuns": [
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-example11111",
                "Name": "demo_canary",
                "Status": {
                    "State": "PASSED",
                    "StateReason": "",
                    "StateReasonCode": ""
                },
                "Timeline": {
                    "Started": "2024-10-16T10:38:57.013000+05:30",
                    "Completed": "2024-10-16T10:39:25.793000+05:30"
                },
                "ArtifactS3Location": "cw-syn-results-123456789012-us-east-1/canary/us-east-1/demo_canary-abc-example1234/2024/10/15/13/50-39-690"
            }
        ]
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.