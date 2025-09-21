**To update the engagement plan of contact**

The following ``update-contact`` example updates the engagement plan of the contact Akua to include the three types of contacts channels. This is done after creating contact channels for Akua. ::

    aws ssm-contacts update-contact \
        --contact-id "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam" \
        --plan '{"Stages": [{"DurationInMinutes": 5, "Targets": [{"ChannelTargetInfo": {"ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/beb25840-5ac8-4644-95cc-7a8de390fa65","RetryIntervalInMinutes": 1 }}]}, {"DurationInMinutes": 5, "Targets": [{"ChannelTargetInfo":{"ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/49f3c24d-5f9f-4638-ae25-3f49e04229ad", "RetryIntervalInMinutes": 1}}]}, {"DurationInMinutes": 5, "Targets": [{"ChannelTargetInfo": {"ContactChannelId": "arn:aws:ssm-contacts:us-east-2:111122223333:contact-channel/akuam/77d4f447-f619-4954-afff-85551e369c2a","RetryIntervalInMinutes": 1 }}]}]}'

This command produces no output.

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.