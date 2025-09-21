**To update a timeline event**

The following ``update-timeline-event`` example updates the time that the event occurred. ::

    aws ssm-incidents update-timeline-event \
        --event-id 20bcc812-8a94-4cd7-520c-0ff742111424 \
        --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308" \
        --event-time "2021-05-21T18:10:57+00:00"

This command produces no output.

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.