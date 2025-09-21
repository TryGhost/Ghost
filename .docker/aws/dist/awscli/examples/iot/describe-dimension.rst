**To get information about a dimension**

The following ``describe-dimension`` example gets information about a dimension named ``TopicFilterForAuthMessages``. ::

    aws iot describe-dimension \
        --name TopicFilterForAuthMessages

Output::

    {
        "name": "TopicFilterForAuthMessages",
        "arn": "arn:aws:iot:eu-west-2:123456789012:dimension/TopicFilterForAuthMessages",
        "type": "TOPIC_FILTER",
        "stringValues": [
            "device/+/auth"
        ],
        "creationDate": 1578620223.255,
        "lastModifiedDate": 1578620223.255
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
