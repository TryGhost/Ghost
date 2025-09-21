**Example 1: To create a custom timeline event**

The following ``create-timeline-event`` example creates a custom timeline event at the specified time on the specified incident. ::

    aws ssm-incidents create-timeline-event \
        --event-data "\"example timeline event\"" \
        --event-time 2022-10-01T20:30:00.000 \
        --event-type "Custom Event" \
        --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4EXAMPLE"

Output::

    {
        "eventId": "c0bcc885-a41d-eb01-b4ab-9d2deEXAMPLE",
        "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4EXAMPLE"
    }

**Example 2: To create a timeline event with an incident note**

The following ``create-timeline-event`` example creates a timeline event that is listed in the 'Incident notes' panel. ::

    aws ssm-incidents create-timeline-event \
         --event-data "\"New Note\"" \
         --event-type "Note" \
         --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Test/6cc46130-ca6c-3b38-68f1-f6abeEXAMPLE" \
         --event-time 2023-06-20T12:06:00.000 \
         --event-references '[{"resource":"arn:aws:ssm-incidents::111122223333:incident-record/Test/6cc46130-ca6c-3b38-68f1-f6abeEXAMPLE"}]'

Output::

    {
        "eventId": "a41dc885-c0bc-b4ab-eb01-de9d2EXAMPLE",
        "incidentRecordArn": "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4EXAMPLE"
    }

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.