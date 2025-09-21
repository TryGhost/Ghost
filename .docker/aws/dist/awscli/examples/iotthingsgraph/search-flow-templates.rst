**To search for flows (or workflows)**

The following ``search-flow-templates`` example searches for all flows (workflows) that contain the Camera device model. ::

    aws iotthingsgraph search-flow-templates \
        --filters name="DEVICE_MODEL_ID",value="urn:tdm:aws/examples:DeviceModel:Camera"

Output::

    {
        "summaries": [
            {
                "id": "urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow",
                "revisionNumber": 1,
                "createdAt": 1559247540.292
            },
            {
                "id": "urn:tdm:us-west-2/123456789012/default:Workflow:SecurityFlow",
                "revisionNumber": 3,
                "createdAt": 1548283099.27
            }
        ]
    }

For more information, see `Working with Flows <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-workflows.html>`__ in the *AWS IoT Things Graph User Guide*.
