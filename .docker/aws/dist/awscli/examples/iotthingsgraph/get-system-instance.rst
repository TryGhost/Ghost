**To get a system instance**

The following ``get-system-instance`` example gets a definition for a system instance. ::

    aws iotthingsgraph get-system-instance \
        --id "urn:tdm:us-west-2/123456789012/default:Deployment:Room218"

Output::

    {
        "description": {
            "summary": {
                "id": "urn:tdm:us-west-2/123456789012/default:Deployment:Room218",
                "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:Deployment/default/Room218",
                "status": "NOT_DEPLOYED",
                "target": "CLOUD",
                "createdAt": 1559249315.208,
                "updatedAt": 1559249315.208
            },
            "definition": {
                "language": "GRAPHQL",
                "text": "{\r\nquery Room218 @deployment(id: \"urn:tdm:us-west-2/123456789012/default:Deployment:Room218\", systemId: \"urn:tdm:us-west-2/123456789012/default:System:SecurityFlow\") {\r\n    motionSensor(deviceId: \"MotionSensorName\")\r\n    screen(deviceId: \"ScreenName\")\r\n    camera(deviceId: \"CameraName\") \r\n    triggers {MotionEventTrigger(description: \"a trigger\") {  \r\n    condition(expr: \"devices[name == 'motionSensor'].events[name == 'StateChanged'].lastEvent\") \r\n    action(expr: \"ThingsGraph.startFlow('SecurityFlow', bindings[name == 'camera'].deviceId, bindings[name == 'screen'].deviceId)\")\r\n    }\r\n   }\r\n  }\r\n  }"
            },
            "metricsConfiguration": {
                "cloudMetricEnabled": false
            },
            "validatedNamespaceVersion": 5,
            "flowActionsRoleArn": "arn:aws:iam::123456789012:role/ThingsGraphRole"
        }
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
