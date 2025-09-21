**To start an incident**

The following ``start-incident`` example starts an incident using the specified response plan. ::

    aws ssm-incidents start-incident \
        --response-plan-arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan"

Output::

    {
        "incidentRecordArn": "arn:aws:ssm-incidents::682428703967:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"
    }

For more information, see `Incident creation <https://docs.aws.amazon.com/incident-manager/latest/userguide/incident-creation.html>`__ in the *Incident Manager User Guide*.