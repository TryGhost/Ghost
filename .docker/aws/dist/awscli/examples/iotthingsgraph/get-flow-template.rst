**To get a flow definition**

The following ``get-flow-template`` example gets a definition for a flow (workflow). ::

    aws iotthingsgraph get-flow-template \
        --id "urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow"

Output::

    {
        "description": {
            "summary": {
                "id": "urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow",
                "revisionNumber": 1,
                "createdAt": 1559247540.292
            },
            "definition": {
                "language": "GRAPHQL",
                "text": "{\nquery MyFlow($camera: string!, $screen: string!) @workflowType(id: \"urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow\") @annotation(type: \"tgc:FlowEvent\", id: \"sledged790c1b2bcd949e09da0c9bfc077f79d\", x: 1586, y: 653) @triggers(definition: \"{MotionSensor(description: \\\"\\\") @position(x: 1045, y: 635.6666564941406) {\\n  condition(expr: \\\"devices[name == \\\\\\\"motionSensor\\\\\\\"].events[name == \\\\\\\"StateChanged\\\\\\\"].lastEvent\\\")\\n  action(expr: \\\"\\\")\\n}}\") {\n  variables {\n    cameraResult @property(id: \"urn:tdm:aws/examples:property:CameraStateProperty\")\n  }\n  steps {\n    step(name: \"Camera\", outEvent: [\"sledged790c1b2bcd949e09da0c9bfc077f79d\"]) @position(x: 1377, y: 638.6666564941406) {\n      DeviceActivity(deviceModel: \"urn:tdm:aws/examples:deviceModel:Camera\", out: \"cameraResult\", deviceId: \"${camera}\") {\n        capture\n      }\n    }\n    step(name: \"Screen\", inEvent: [\"sledged790c1b2bcd949e09da0c9bfc077f79d\"]) @position(x: 1675.6666870117188, y: 637.9999847412109) {\n      DeviceActivity(deviceModel: \"urn:tdm:aws/examples:deviceModel:Screen\", deviceId: \"${screen}\") {\n        display(imageUrl: \"${cameraResult.lastClickedImage}\")\n      }\n    }\n  }\n}\n}"
            },
            "validatedNamespaceVersion": 5
        }
    }

For more information, see `Working with Flows <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-workflows.html>`__ in the *AWS IoT Things Graph User Guide*.
