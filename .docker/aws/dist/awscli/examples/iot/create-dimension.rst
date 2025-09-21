**To create a dimension**

The following ``create-dimension`` creates a dimension with a single topic filter called ``TopicFilterForAuthMessages``. ::

    aws iot create-dimension \
        --name TopicFilterForAuthMessages \
        --type TOPIC_FILTER \
        --string-values device/+/auth 

Output::

    {
        "name": "TopicFilterForAuthMessages",
        "arn": "arn:aws:iot:eu-west-2:123456789012:dimension/TopicFilterForAuthMessages"
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
