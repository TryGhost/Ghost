**To get details of a response plan**

The following ``command-name`` example gets details about a specified response plan in your AWS account. ::

    aws ssm-incidents get-response-plan \
        --arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan"

Output::

    {
        "actions": [
            {
                "ssmAutomation": {
                    "documentName": "AWSIncidents-CriticalIncidentRunbookTemplate",
                    "documentVersion": "$DEFAULT",
                    "roleArn": "arn:aws:iam::111122223333:role/aws-service-role/ssm-incidents.amazonaws.com/AWSServiceRoleForIncidentManager",
                    "targetAccount": "RESPONSE_PLAN_OWNER_ACCOUNT"
                }
            }
        ],
        "arn": "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan",
        "chatChannel": {
            "chatbotSns": [
                "arn:aws:sns:us-east-1:111122223333:Standard_User"
            ]
        },
        "displayName": "Example response plan",
        "engagements": [
            "arn:aws:ssm-contacts:us-east-1:111122223333:contact/example"
        ],
        "incidentTemplate": {
            "impact": 5,
            "title": "Example-Incident"
        },
        "name": "Example-Response-Plan"
    }

For more information, see `Incident preparation <https://docs.aws.amazon.com/incident-manager/latest/userguide/incident-response.html>`__ in the *Incident Manager User Guide*.