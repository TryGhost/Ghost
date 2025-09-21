**To delete a timeline event**

The following ``delete-timeline-event`` example deletes a custom timeline event from the specified incident record. ::

    aws ssm-incidents delete-timeline-event \
        --event-id "c0bcc885-a41d-eb01-b4ab-9d2de193643c" \
        --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"

This command produces no output.

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.