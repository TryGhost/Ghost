**To update an incident record**

The following ``command-name`` example resolves the specified incident. ::

    aws ssm-incidents update-incident-record \
        --arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308" \
        --status "RESOLVED"

This command produces no output.

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.