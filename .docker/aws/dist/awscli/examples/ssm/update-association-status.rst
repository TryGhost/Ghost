**To update the association status**

The following ``update-association-status`` example updates the association status of the association between an instance and a document. ::

    aws ssm update-association-status \
        --name "AWS-UpdateSSMAgent" \
        --instance-id "i-1234567890abcdef0" \
        --association-status "Date=1424421071.939,Name=Pending,Message=temp_status_change,AdditionalInfo=Additional-Config-Needed"

Output::

    {
        "AssociationDescription": {
            "Name": "AWS-UpdateSSMAgent",
            "InstanceId": "i-1234567890abcdef0",
            "AssociationVersion": "1",
            "Date": 1550507529.604,
            "LastUpdateAssociationDate": 1550507806.974,
            "Status": {
                "Date": 1424421071.0,
                "Name": "Pending",
                "Message": "temp_status_change",
                "AdditionalInfo": "Additional-Config-Needed"
            },
            "Overview": {
                "Status": "Success",
                "AssociationStatusAggregatedCount": {
                    "Success": 1
                }
            },
            "DocumentVersion": "$DEFAULT",
            "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
            "Targets": [
                {
                    "Key": "InstanceIds",
                    "Values": [
                        "i-1234567890abcdef0"
                    ]
                }
            ],
            "LastExecutionDate": 1550507808.0,
            "LastSuccessfulExecutionDate": 1550507808.0
        }
    }

For more information, see `Working with associations in Systems Manager <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-associations.html>`__ in the *AWS Systems Manager User Guide*.