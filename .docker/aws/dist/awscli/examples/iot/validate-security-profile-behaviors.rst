**Example 1: To validate the behaviors parameters for a security profile**

The following ``validate-security-profile-behaviors`` example validates a well-formed and correct set of behaviors for an AWS IoT Device Defender security profile. ::

    aws iot validate-security-profile-behaviors \
        --behaviors "[{\"name\":\"CellularBandwidth\",\"metric\":\"aws:message-byte-size\",\"criteria\":{\"comparisonOperator\":\"greater-than\",\"value\":{\"count\":128},\"consecutiveDatapointsToAlarm\":1,\"consecutiveDatapointsToClear\":1}},{\"name\":\"Authorization\",\"metric\":\"aws:num-authorization-failures\",\"criteria\":{\"comparisonOperator\":\"greater-than\",\"value\":{\"count\":12},\"durationSeconds\":300,\"consecutiveDatapointsToAlarm\":1,\"consecutiveDatapointsToClear\":1}}]"

Output::

    {
        "valid": true,
        "validationErrors": []
    }

**Example 2: To validate incorrect behaviors parameters for a security profile**

The following ``validate-security-profile-behaviors`` example validates a set of behaviors that contains an error for an AWS IoT Device Defender security profile. ::

    aws iot validate-security-profile-behaviors \
        --behaviors "[{\"name\":\"CellularBandwidth\",\"metric\":\"aws:message-byte-size\",\"criteria\":{\"comparisonOperator\":\"greater-than\",\"value\":{\"count\":128},\"consecutiveDatapointsToAlarm\":1,\"consecutiveDatapointsToClear\":1}},{\"name\":\"Authorization\",\"metric\":\"aws:num-authorization-failures\",\"criteria\":{\"comparisonOperator\":\"greater-than\",\"value\":{\"count\":12},\"durationSeconds\":300,\"consecutiveDatapointsToAlarm\":100000,\"consecutiveDatapointsToClear\":1}}]"

Output::

    {
        "valid": false,
        "validationErrors": [
            {
                "errorMessage": "Behavior Authorization is malformed. consecutiveDatapointsToAlarm 100000 should be in range[1,10]"
            }
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
