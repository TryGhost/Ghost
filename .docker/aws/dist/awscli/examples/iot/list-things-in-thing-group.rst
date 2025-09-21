**To list the things that belong to a group**

The following ``list-things-in-thing-group`` example lists the things that belong to the specified thing group. ::

    aws iot list-things-in-thing-group \
        --thing-group-name LightBulbs

Output::

    {
        "things": [
            "MyLightBulb"
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.
