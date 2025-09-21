**To delete a core network**

The following ``delete-core-network`` example deletes a core network from a Cloud WAN global network. ::

    aws networkmanager delete-core-network \
        --core-network-id core-network-0fab62fe438d94db6 

Output::

    {
        "CoreNetwork": {
            "GlobalNetworkId": "global-network-0d59060f16a73bc41",
            "CoreNetworkId": "core-network-0fab62fe438d94db6",
            "Description": "Main headquarters location",
            "CreatedAt": "2021-12-09T18:31:11+00:00",
            "State": "DELETING",
            "Segments": [
                {
                    "Name": "dev",
                    "EdgeLocations": [
                        "us-east-1"
                    ],
                    "SharedSegments": []
                }
            ],
            "Edges": [
                {
                    "EdgeLocation": "us-east-1",
                    "Asn": 64512,
                    "InsideCidrBlocks": []
                }
            ]
        }
    }

For more information, see `Core networks <https://docs.aws.amazon.com/vpc/latest/cloudwan/cloudwan-networks-working-with.html#cloudwan-core-networks>`__ in the *Cloud WAN User Guide*.