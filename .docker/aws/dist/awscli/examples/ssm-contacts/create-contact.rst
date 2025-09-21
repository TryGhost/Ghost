**To create a contact**

The following ``create-contact`` example creates a contact in your environment with a blank plan. The plan can be updated after creating contact channels. Use the create-contact-channel command with the output ARN of this command. After you have created contact channels for this contact use update-contact to update the plan. ::

    aws ssm-contacts create-contact \
        --alias "akuam" \
        --display-name "Akua Mansa" \
        --type PERSONAL \
        --plan '{"Stages": []}'

Output::

    {
        "ContactArn": "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.