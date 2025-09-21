**To create a site**

The following ``create-site`` example creates a site in the specified global network. The site details include a description and the location information. ::

    aws networkmanager create-site \
        --global-network-id global-network-01231231231231231 \
        --description  "New York head office" \
        --location Latitude=40.7128,Longitude=-74.0060 \
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
            "State": "PENDING"
        }
    }

For more information, see `Working with Sites <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#working-with-sites>`__ in the *Transit Gateway Network Manager Guide*.
