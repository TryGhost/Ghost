**To list the dimensions for your AWS account**

The following ``list-dimensions`` example lists all AWS IoT Device Defender dimensions that are defined in your AWS account. ::

    aws iot list-dimensions

Output::

    {
        "dimensionNames": [
            "TopicFilterForAuthMessages",
            "TopicFilterForActivityMessages"
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
