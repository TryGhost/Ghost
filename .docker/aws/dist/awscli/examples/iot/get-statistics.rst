**To search the device index for aggregate data**

The following ``get-statistics`` example returns the number of things that have a property called ``connectivity.connected`` set to ``false`` (that is, the number of devices that are not connected) in their device shadow. ::

    aws iot get-statistics \
        --index-name AWS_Things \
        --query-string "connectivity.connected:false"

Output::

    {
        "statistics": {
            "count": 6
        }
    }

For more information, see `Getting Statistics About Your Device Fleet <https://docs.aws.amazon.com/iot/latest/developerguide/index-aggregate.html>`__ in the *AWS IoT Developer Guide*.
