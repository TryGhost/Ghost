**To search for flow executions**

The following ``search-flow-executions`` example search for all executions of a flow in a specified system instance. ::

    aws iotthingsgraph search-flow-executions \
        --system-instance-id "urn:tdm:us-west-2/123456789012/default:Deployment:Room218"

Output::

    {
       "summaries": [ 
          { 
             "createdAt": 1559247540.656,
             "flowExecutionId": "f6294f1e-b109-4bbe-9073-f451a2dda2da",
             "flowTemplateId": "urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow",
             "status": "RUNNING ",
             "systemInstanceId": "urn:tdm:us-west-2/123456789012/default:System:MySystem",
             "updatedAt": 1559247540.656
          }
       ]
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
