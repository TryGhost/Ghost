**To create a response plan**

The following ``create-response-plan`` example creates a response plan with the specified details. ::

    aws ssm-incidents create-response-plan \
        --chat-channel '{"chatbotSns": ["arn:aws:sns:us-east-1:111122223333:Standard_User"]}' \
        --display-name "Example response plan" \
        --incident-template '{"impact": 5, "title": "example-incident"}' \
        --name "example-response" \
        --actions '[{"ssmAutomation": {"documentName": "AWSIncidents-CriticalIncidentRunbookTemplate", "documentVersion": "$DEFAULT", "roleArn": "arn:aws:iam::111122223333:role/aws-service-role/ssm-incidents.amazonaws.com/AWSServiceRoleForIncidentManager", "targetAccount": "RESPONSE_PLAN_OWNER_ACCOUNT"}}]' \
        --engagements '["arn:aws:ssm-contacts:us-east-1:111122223333:contact/example"]'

Output::

    {
        "arn": "arn:aws:ssm-incidents::111122223333:response-plan/example-response"
    }

For more information, see `Incident preparation <https://docs.aws.amazon.com/incident-manager/latest/userguide/incident-response.html>`__ in the *Incident Manager User Guide*.