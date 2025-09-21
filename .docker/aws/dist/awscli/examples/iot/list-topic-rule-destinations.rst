**To list your topic rule destinations**

The following ``list-topic-rule-destinations`` example lists all topic rule destinations that you have defined in the current AWS Region. ::

    aws iot list-topic-rule-destinations

Output::

    {
        "destinationSummaries": [
            {
                "arn": "arn:aws:iot:us-west-2:123456789012:ruledestination/http/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "status": "ENABLED",
                "httpUrlSummary": {
                    "confirmationUrl": "https://example.com"
                }
            }
        ]
    }

For more information, see `Working with topic rule destinations <https://docs.aws.amazon.com/iot/latest/developerguide/rule-destination.html>`__ in the *AWS IoT Developer Guide*.