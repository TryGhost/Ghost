**To create a system instance**

The following ``create-system-instance`` example creates a system instance. The value of ``MySystemInstanceDefinition`` is the GraphQL that models the system instance. ::

    aws iotthingsgraph create-system-instance -\
        -definition language=GRAPHQL,text="MySystemInstanceDefinition" \
        --target CLOUD \
        --flow-actions-role-arn myRoleARN

Output::

    {
        "summary": {
            "id": "urn:tdm:us-west-2/123456789012/default:Deployment:Room218",
            "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:Deployment/default/Room218",
            "status": "NOT_DEPLOYED",
            "target": "CLOUD",
            "createdAt": 1559249315.208,
            "updatedAt": 1559249315.208
        }
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
