**To list the related-item resources of an OpsItem**

The following ``list-ops-item-related-items`` example lists the related-item resources of an OpsItem. ::

    aws ssm list-ops-item-related-items \
        --ops-item-id "oi-f99f2EXAMPLE"

Output::

    {
        "Summaries": [
            {
                "OpsItemId": "oi-f99f2EXAMPLE",
                "AssociationId": "e2036148-cccb-490e-ac2a-390e5EXAMPLE",
                "ResourceType": "AWS::SSMIncidents::IncidentRecord",
                "AssociationType": "IsParentOf",
                "ResourceUri": "arn:aws:ssm-incidents::111122223333:incident-record/example-response/64bd9b45-1d0e-2622-840d-03a87a1451fa",
                "CreatedBy": {
                    "Arn": "arn:aws:sts::111122223333:assumed-role/AWSServiceRoleForIncidentManager/IncidentResponse"
                },
                "CreatedTime": "2021-08-11T18:47:14.994000+00:00",
                "LastModifiedBy": {
                    "Arn": "arn:aws:sts::111122223333:assumed-role/AWSServiceRoleForIncidentManager/IncidentResponse"
                },
                "LastModifiedTime": "2021-08-11T18:47:14.994000+00:00"
            }
        ]
    }

For more information, see `Working with Incident Manager incidents in OpsCenter <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-create-OpsItems-for-Incident-Manager.html>`__ in the *AWS Systems Manager User Guide*.