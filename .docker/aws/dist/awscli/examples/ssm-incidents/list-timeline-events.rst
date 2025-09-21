**To list timeline events of an incident**

The following ``command-name`` example lists the timeline events of the specified incident. ::

    aws ssm-incidents list-timeline-events \
        --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"

Output::

    {
        "eventSummaries": [
            {
                "eventId": "8cbcc889-35e1-a42d-2429-d6f100799915",
                "eventTime": "2021-05-21T22:36:13.766000+00:00",
                "eventType": "SSM Incident Record Update",
                "eventUpdatedTime": "2021-05-21T22:36:13.766000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            },
            {
                "eventId": "a2bcc825-aab5-1787-c605-f9bb2640d85b",
                "eventTime": "2021-05-21T18:58:46.443000+00:00",
                "eventType": "SSM Incident Record Update",
                "eventUpdatedTime": "2021-05-21T18:58:46.443000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            },
            {
                "eventId": "5abcc812-89c0-b0a8-9437-1c74223d4685",
                "eventTime": "2021-05-21T18:16:59.149000+00:00",
                "eventType": "SSM Incident Record Update",
                "eventUpdatedTime": "2021-05-21T18:16:59.149000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            },
            {
                "eventId": "06bcc812-8820-405e-4065-8d2b14d29b92",
                "eventTime": "2021-05-21T18:16:58+00:00",
                "eventType": "SSM Automation Execution Start Failure for Incident",
                "eventUpdatedTime": "2021-05-21T18:16:58.689000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            },
            {
                "eventId": "20bcc812-8a94-4cd7-520c-0ff742111424",
                "eventTime": "2021-05-21T18:16:57+00:00",
                "eventType": "Custom Event",
                "eventUpdatedTime": "2021-05-21T18:16:59.944000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            },
            {
                "eventId": "c0bcc885-a41d-eb01-b4ab-9d2de193643c",
                "eventTime": "2020-10-01T20:30:00+00:00",
                "eventType": "Custom Event",
                "eventUpdatedTime": "2021-05-21T22:28:26.299000+00:00",
                "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
            }
        ]
    }

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.