**To get an incident record**

The following ``get-incident-record`` example gets details about the specified incident record. ::

    aws ssm-incidents get-incident-record \
        --arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"

Output::

    {
        "incidentRecord": {
            "arn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308",
            "automationExecutions": [],
            "creationTime": "2021-05-21T18:16:57.579000+00:00",
            "dedupeString": "c4bcc812-85e7-938d-2b78-17181176ee1a",
            "impact": 5,
            "incidentRecordSource": {
                "createdBy": "arn:aws:iam::111122223333:user/draliatp",
                "invokedBy": "arn:aws:iam::111122223333:user/draliatp",
                "source": "aws.ssm-incidents.custom"
            },
            "lastModifiedBy": "arn:aws:iam::111122223333:user/draliatp",
            "lastModifiedTime": "2021-05-21T18:16:59.149000+00:00",
            "notificationTargets": [],
            "status": "OPEN",
            "title": "Example-Incident"
        }
    }

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.