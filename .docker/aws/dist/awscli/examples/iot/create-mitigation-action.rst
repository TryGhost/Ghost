**To create a mitigation action**

The following ``create-mitigation-action`` example defines a mitigation action named ``AddThingsToQuarantineGroup1Action`` that, when applied, moves things into the thing group named ``QuarantineGroup1``. This action overrides dynamic thing groups. ::

    aws iot create-mitigation-action --cli-input-json file::params.json
    
Contents of ``params.json``::

    {
        "actionName": "AddThingsToQuarantineGroup1Action",
        "actionParams": {
            "addThingsToThingGroupParams": {
                "thingGroupNames": [
                    "QuarantineGroup1"
                ],
                "overrideDynamicGroups": true
            }
        },
        "roleArn": "arn:aws:iam::123456789012:role/service-role/MoveThingsToQuarantineGroupRole"
    }

Output::

    {
        "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/AddThingsToQuarantineGroup1Action",
        "actionId": "992e9a63-a899-439a-aa50-4e20c52367e1"
    }

For more information, see `CreateMitigationAction (Mitigation Action Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/iot/latest/developerguide/iot/latest/developerguide/mitigation-action-commands.html.html#dd-api-iot-CreateMitigationAction>`__ in the *AWS IoT Developer Guide*.
