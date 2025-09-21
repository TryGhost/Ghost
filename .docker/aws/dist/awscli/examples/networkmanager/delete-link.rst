**To delete a link**

The following ``delete-link`` example deletes the specified link from the specified global network. ::

    aws networkmanager delete-link \
        --global-network-id global-network-01231231231231231  \
        --link-id link-11112222aaaabbbb1 \
        --region us-west-2

Output::

    {
        "Link": {
            "LinkId": "link-11112222aaaabbbb1",
            "LinkArn": "arn:aws:networkmanager::123456789012:link/global-network-01231231231231231/link-11112222aaaabbbb1",
            "GlobalNetworkId": "global-network-01231231231231231",
            "SiteId": "site-444555aaabbb11223",
            "Description": "VPN Link",
            "Type": "broadband",
            "Bandwidth": {
                "UploadSpeed": 20,
                "DownloadSpeed": 20
            },
            "Provider": "AnyCompany",
            "CreatedAt": 1575555811.0,
            "State": "DELETING"
        }
    }

For more information, see `Working with Links <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#working-with-links>`__ in the *Transit Gateway Network Manager Guide*.
