**To list the available response plans**

The following ``list-response-plans`` example lists the available response plans in your Amazon Web Services account. ::

    aws ssm-incidents list-response-plans

Output::

    {
        "responsePlanSummaries": [
            {
                "arn": "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan",
                "displayName": "Example response plan",
                "name": "Example-Response-Plan"
            }
        ]
    }

For more information, see `Incident preparation <https://docs.aws.amazon.com/incident-manager/latest/userguide/incident-response.html>`__ in the *Incident Manager User Guide*.