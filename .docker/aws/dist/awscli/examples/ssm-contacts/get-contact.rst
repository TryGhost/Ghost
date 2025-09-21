**Example 1: To describe a contact plan**

The following ``get-contact`` example describes a contact. ::

    aws ssm-contacts get-contact \
        --contact-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam"

Output::

    {
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
        "Alias": "akuam",
        "DisplayName": "Akua Mansa",
        "Type": "PERSONAL",
        "Plan": {
            "Stages": [
                {
                    "DurationInMinutes": 5,
                    "Targets": [
                        {
                            "ChannelTargetInfo": {
                                "ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/beb25840-5ac8-4644-95cc-7a8de390fa65",
                                "RetryIntervalInMinutes": 1
                            }
                        }
                    ]
                },
                {
                    "DurationInMinutes": 5,
                    "Targets": [
                        {
                            "ChannelTargetInfo": {
                                "ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/49f3c24d-5f9f-4638-ae25-3f49e04229ad",
                                "RetryIntervalInMinutes": 1
                            }
                        }
                    ]
                },
                {
                    "DurationInMinutes": 5,
                    "Targets": [
                        {
                            "ChannelTargetInfo": {
                                "ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/77d4f447-f619-4954-afff-85551e369c2a",
                                "RetryIntervalInMinutes": 1
                            }
                        }
                    ]
                }
            ]
        }
    }

**Example 2: To describe an escalation plan**

The following ``get-contact`` example describes an escalation plan. ::

    aws ssm-contacts get-contact \
    --contact-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation"

Output::

    {
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation",
        "Alias": "example_escalation",
        "DisplayName": "Example Escalation",
        "Type": "ESCALATION",
        "Plan": {
            "Stages": [
                {
                    "DurationInMinutes": 5,
                    "Targets": [
                        {
                            "ContactTargetInfo": {
                                "ContactId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam",
                                "IsEssential": true
                            }
                        }
                    ]
                },
                {
                    "DurationInMinutes": 5,
                    "Targets": [
                        {
                            "ContactTargetInfo": {
                                "ContactId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/alejr",
                                "IsEssential": false
                            }
                        }
                    ]
                },
                {
                    "DurationInMinutes": 0,
                    "Targets": [
                        {
                            "ContactTargetInfo": {
                                "ContactId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/anasi",
                                "IsEssential": false
                            }
                        }
                    ]
                }
            ]
        }
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.