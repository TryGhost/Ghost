**To retrieve information for an organization**

The following ``describe-organization`` command retrieves information for the specified Amazon WorkMail organization. ::

    aws workmail describe-organization \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27

Output::

    {
        "OrganizationId": "m-d281d0a2fd824be5b6cd3d3ce909fd27",
        "Alias": "alias",
        "State": "Active",
        "DirectoryId": "d-926726012c",
        "DirectoryType": "VpcDirectory",
        "DefaultMailDomain": "site.awsapps.com",
        "CompletedDate": 1522693605.468,
        "ARN": "arn:aws:workmail:us-west-2:111122223333:organization/m-n1pq2345678r901st2u3vx45x6789yza"
    }

For more information, see `Working with Organizations <https://docs.aws.amazon.com/workmail/latest/adminguide/organizations_overview.html>`__ in the *Amazon WorkMail Administrator Guide*.
