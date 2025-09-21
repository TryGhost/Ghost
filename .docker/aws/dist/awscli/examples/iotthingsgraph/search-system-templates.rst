**To search for system**

The following ``search-system-templates`` example searches for all systems that contain the specified flow. ::

    aws iotthingsgraph search-system-templates \
        --filters name="FLOW_TEMPLATE_ID",value="urn:tdm:us-west-2/123456789012/default:Workflow:SecurityFlow"

Output::

    {
        "summaries": [
            {
                "id": "urn:tdm:us-west-2/123456789012/default:System:SecurityFlow",
                "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:System/default/SecurityFlow",
                "revisionNumber": 1,
                "createdAt": 1548283099.433
            }
        ]
    }

For more information, see `Working with Flows <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-workflows.html>`__ in the *AWS IoT Things Graph User Guide*.
