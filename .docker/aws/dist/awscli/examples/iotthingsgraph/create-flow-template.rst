**To create a flow**

The following ``create-flow-template`` example creates a flow (workflow). The value of ``MyFlowDefinition`` is the GraphQL that models the flow. ::

    aws iotthingsgraph create-flow-template \
        --definition language=GRAPHQL,text="MyFlowDefinition"

Output::

    {
        "summary": {
            "createdAt": 1559248067.545,
            "id": "urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow",
            "revisionNumber": 1
        }
    }

For more information, see `Working with Flows <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-workflows.html>`__ in the *AWS IoT Things Graph User Guide*.
