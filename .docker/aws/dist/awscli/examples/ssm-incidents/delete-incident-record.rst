**To delete an incident record**

The following ``delete-incident-record`` example deletes the specified incident record. ::

    aws ssm-incidents delete-incident-record \
        --arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"

This command produces no output.

For more information, see `Incident tracking <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking.html>`__ in the *Incident Manager User Guide*.