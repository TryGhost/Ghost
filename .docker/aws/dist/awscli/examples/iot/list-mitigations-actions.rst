**To list all defined mitigation actions**

The following ``list-mitigations-actions`` example lists all defined mitigation actions for your AWS account and Region. For each action, the name, ARN, and creation date are listed. ::

    aws iot list-mitigation-actions

Output::

    {
        "actionIdentifiers": [
            {
                "actionName": "DeactivateCACertAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/DeactivateCACertAction",
                "creationDate": "2019-12-10T11:12:47.574000-08:00"
            },
            {
                "actionName": "ResetPolicyVersionAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/ResetPolicyVersionAction",
                "creationDate": "2019-12-10T11:11:48.920000-08:00"
            },
            {
                "actionName": "PublishFindingToSNSAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/PublishFindingToSNSAction",
                "creationDate": "2019-12-10T11:10:49.546000-08:00"
            },
            {
                "actionName": "AddThingsToQuarantineGroupAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/AddThingsToQuarantineGroupAction",
                "creationDate": "2019-12-10T11:09:35.999000-08:00"
            },
            {
                "actionName": "UpdateDeviceCertAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/UpdateDeviceCertAction",
                "creationDate": "2019-12-10T11:08:44.263000-08:00"
            },
            {
                "actionName": "SampleMitigationAction",
                "actionArn": "arn:aws:iot:us-west-2:123456789012:mitigationaction/SampleMitigationAction",
                "creationDate": "2019-12-10T11:03:41.840000-08:00"
            }
        ]
    }

For more information, see `ListMitigationActions (Mitigation Action Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/mitigation-action-commands.html#dd-api-iot-ListMitigationActions>`__ in the *AWS IoT Developer Guide*.
