**To get information about events in a flow execution**

The following ``list-flow-execution-messages`` example gets information about events in a flow execution. ::

    aws iotthingsgraph list-flow-execution-messages \
        --flow-execution-id "urn:tdm:us-west-2/123456789012/default:Workflow:SecurityFlow_2019-05-11T19:39:55.317Z_MotionSensor_69b151ad-a611-42f5-ac21-fe537f9868ad"

Output::

    {
        "messages": [
            { 
             "eventType": "EXECUTION_STARTED",
             "messageId": "f6294f1e-b109-4bbe-9073-f451a2dda2da",
             "payload": "Flow execution started",
             "timestamp": 1559247540.656
            }
        ]
    }

For more information, see `Working with Flows <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-workflows.html>`__ in the *AWS IoT Things Graph User Guide*.
