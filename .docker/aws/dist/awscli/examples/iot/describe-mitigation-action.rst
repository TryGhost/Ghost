**To view the details for a defined mitigation action**

The following ``describe-mitigation-action`` example displays details for the specified mitigation action. ::

    aws iot describe-mitigation-action \
        --action-name AddThingsToQuarantineGroupAction

Output::

    {
        "actionName": "AddThingsToQuarantineGroupAction",
        "actionType": "ADD_THINGS_TO_THING_GROUP",
        "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/AddThingsToQuarantineGroupAction",
        "actionId": "2fd2726d-98e1-4abf-b10f-09465ccd6bfa",
        "roleArn": "arn:aws:iam::123456789012:role/service-role/MoveThingsToQuarantineGroupRole",
        "actionParams": {
            "addThingsToThingGroupParams": {
                "thingGroupNames": [
                    "QuarantineGroup1"
                ],
                "overrideDynamicGroups": true
            }
        },
        "creationDate": "2019-12-10T11:09:35.999000-08:00",
        "lastModifiedDate": "2019-12-10T11:09:35.999000-08:00"
    }

For more information, see `DescribeMitigationAction (Mitigation Action Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/mitigation-action-commands.html#dd-api-iot-DescribeMitigationAction>`__ in the *AWS IoT Developer Guide*.