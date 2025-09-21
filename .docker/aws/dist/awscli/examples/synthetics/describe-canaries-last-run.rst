**To see information from the most recent run of each canary**

The following ``describe-canaries-last-run`` example returns the most recent run of each canary that you have created. ::

    aws synthetics describe-canaries-last-run

Output::

    {
        "CanariesLastRun": [
            {
                "CanaryName": "demo_canary",
                "LastRun": {
                    "Id": "a1b2c3d4-5678-90ab-cdef-example11111",
                    "Name": "demo_canary",
                    "Status": {
                        "State": "PASSED",
                        "StateReason": "",
                        "StateReasonCode": ""
                    },
                    "Timeline": {
                        "Started": "2024-10-15T19:20:39.691000+05:30",
                        "Completed": "2024-10-15T19:20:58.211000+05:30"
                    },
                    "ArtifactS3Location": "cw-syn-results-123456789012-us-east-1/canary/us-east-1/demo_canary-abc-example1234/2024/10/15/13/50-39-690"
                }
            }
        ]
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.