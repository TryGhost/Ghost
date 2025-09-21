**To associate a thing with a thing type**

The following ``update-thing`` example associates a thing in the AWS IoT registry with a thing type. When you make the association, you provide values for the attributes defined by the thing type. ::

    aws iot update-thing \
        --thing-name "MyOtherLightBulb" \
        --thing-type-name "LightBulb" \
        --attribute-payload "{"attributes": {"wattage":"75", "model":"123"}}"

This command does not produce output. Use the ``describe-thing`` command to see the result.

For more information, see `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.
