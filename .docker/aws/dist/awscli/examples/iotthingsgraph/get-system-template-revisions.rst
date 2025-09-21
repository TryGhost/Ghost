**To get revision information about a system**

The following ``get-system-template-revisions`` example gets revision information about a system. ::

    aws iotthingsgraph get-system-template-revisions \
        --id "urn:tdm:us-west-2/123456789012/default:System:MySystem"

Output::

    {
        "summaries": [
            {
                "id": "urn:tdm:us-west-2/123456789012/default:System:MySystem",
                "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:System/default/MySystem",
                "revisionNumber": 1,
                "createdAt": 1559247540.656
            }
        ]
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
