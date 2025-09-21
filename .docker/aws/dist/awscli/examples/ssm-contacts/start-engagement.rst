**Example 1: To page a contact's contact channels**

The following ``start-engagement`` pages contact's contact channels. Sender, subject, public-subject, and public-content are all free from fields. Incident Manager sends the subject and content to the provided VOICE or EMAIL contact channels. Incident Manager sends the public-subject and public-content to the provided SMS contact channels. Sender is used to track who started the engagement. ::

    aws ssm-contacts start-engagement \
        --contact-id  "arn:aws:ssm-contacts:us-east-2:111122223333:contact/akuam" \
        --sender "cli" \
        --subject "cli-test" \
        --content "Testing engagements via CLI" \
        --public-subject "cli-test" \
        --public-content "Testing engagements va CLI"

Output::

    {
        "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/akuam/607ced0e-e8fa-4ea7-8958-a237b8803f8f"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.

**Example 2: To page a contact in the provided escalation plan.**

The following ``start-engagement`` engages contact's through an escalation plan. Each contact is paged according to their engagement plan. ::

    aws ssm-contacts start-engagement \
        --contact-id  "arn:aws:ssm-contacts:us-east-2:111122223333:contact/example_escalation" \
        --sender "cli" \
        --subject "cli-test" \
        --content "Testing engagements via CLI" \
        --public-subject "cli-test" \
        --public-content "Testing engagements va CLI"

Output::

    {
        "EngagementArn": "arn:aws:ssm-contacts:us-east-2:111122223333:engagement/example_escalation/69e40ce1-8dbb-4d57-8962-5fbe7fc53356"
    }

For more information, see `Contacts <https://docs.aws.amazon.com/incident-manager/latest/userguide/contacts.html>`__ in the *Incident Manager User Guide*.