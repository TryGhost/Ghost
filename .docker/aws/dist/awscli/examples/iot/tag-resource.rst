**To specify a tag key and value for a resource**

The following ``tag-resource`` example applies the tag with a key ``Assembly`` and the value ``Fact1NW`` to the thing group ``LightBulbs``. ::

    aws iot tag-resource \
        --tags Key=Assembly,Value="Fact1NW" \
        --resource-arn "arn:aws:iot:us-west-2:094249569039:thinggroup/LightBulbs"

This command produces no output.

For more information, see `Tagging Your AWS IoT Resources <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot.html>`__ in the *AWS IoT Developer Guide*.
