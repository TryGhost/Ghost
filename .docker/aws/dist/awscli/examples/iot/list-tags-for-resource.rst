**To display the tags and their values associated with a resource**

The following ``list-tags-for-resource`` example displays the tags and values associated with the thing group ``LightBulbs``. ::

    aws iot list-tags-for-resource \
        --resource-arn "arn:aws:iot:us-west-2:094249569039:thinggroup/LightBulbs"

Output::

    {
        "tags": [
            {
                "Key": "Assembly",
                "Value": "Fact1NW"
            },
            {
                "Key": "MyTag",
                "Value": "777"
            }
        ]
    }

For more information, see `Tagging Your AWS IoT Resources <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot.html>`__ in the *AWS IoT Developer Guide*.
