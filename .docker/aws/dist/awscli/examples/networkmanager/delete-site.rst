**To delete a site**

The following ``delete-site`` example deletes the specified site (``site-444555aaabbb11223``) in the specified global network. ::

    aws networkmanager delete-site \
        --global-network-id global-network-01231231231231231  \
        --site-id site-444555aaabbb11223 \
        --region us-west-2

Output::

    {
        "Site": {
            "SiteId": "site-444555aaabbb11223",
            "SiteArn": "arn:aws:networkmanager::123456789012:site/global-network-01231231231231231/site-444555aaabbb11223",
            "GlobalNetworkId": "global-network-01231231231231231",
            "Description": "New York head office",
            "Location": {
                "Latitude": "40.7128",
                "Longitude": "-74.0060"
            },
            "CreatedAt": 1575554300.0,
            "State": "DELETING"
        }
    }

For more information, see `Working with Sites <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#working-with-sites>`__ in the *Transit Gateway Network Manager Guide*.
