**To deploy a system instance**

The following ``delete-system-template`` example deploys a system instance. ::

    aws iotthingsgraph deploy-system-instance \
        --id "urn:tdm:us-west-2/123456789012/default:Deployment:Room218"

Output::

    {
       "summary": { 
          "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:Deployment:Room218",
          "createdAt": 1559249776.254,
          "id": "urn:tdm:us-west-2/123456789012/default:Deployment:Room218",
          "status": "DEPLOYED_IN_TARGET",
          "target": "CLOUD",
          "updatedAt": 1559249776.254
       }
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
