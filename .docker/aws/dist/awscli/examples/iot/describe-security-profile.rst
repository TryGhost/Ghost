**To get information about a security profile**

The following ``describe-security-profile`` example gets information about the AWS IoT Device Defender security profile named ``PossibleIssue.`` ::

    aws iot describe-security-profile \
        --security-profile-name PossibleIssue

Output::

    {
        "securityProfileName": "PossibleIssue",
        "securityProfileArn": "arn:aws:iot:us-west-2:123456789012:securityprofile/PossibleIssue",
        "securityProfileDescription": "check to see if authorization fails 10 times in 5 minutes or if cellular bandwidth exceeds 128",
        "behaviors": [
            {
                "name": "CellularBandwidth",
                "metric": "aws:message-byte-size",
                "criteria": {
                    "comparisonOperator": "greater-than",
                    "value": {
                        "count": 128
                    },
                    "consecutiveDatapointsToAlarm": 1,
                    "consecutiveDatapointsToClear": 1
                }
            },
            {
                "name": "Authorization",
                "metric": "aws:num-authorization-failures",
                "criteria": {
                    "comparisonOperator": "greater-than",
                    "value": {
                        "count": 10
                    },
                    "durationSeconds": 300,
                    "consecutiveDatapointsToAlarm": 1,
                    "consecutiveDatapointsToClear": 1
                }
            }
        ],
        "version": 1,
        "creationDate": 1560278102.528,
        "lastModifiedDate": 1560278102.528
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
