**To list incident records**

The following ``command-name`` example lists the incident records in your Amazon Web Services account. ::

    aws ssm-incidents list-incident-records

Output::

    {
        "incidentRecordSummaries": [
            {
                "arn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308",
                "creationTime": "2021-05-21T18:16:57.579000+00:00",
                "impact": 5,
                "incidentRecordSource": {
                    "createdBy": "arn:aws:iam::111122223333:user/draliatp",
                    "invokedBy": "arn:aws:iam::111122223333:user/draliatp",
                    "source": "aws.ssm-incidents.custom"
                },
                "status": "OPEN",
                "title": "Example-Incident"
            }
        ]
    }

For more information, see `Incident list <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-list.html>`__ in the *Incident Manager User Guide*.