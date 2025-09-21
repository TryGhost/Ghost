**To retrieve information about a version of a Greengrass group**

The following ``get-group-version`` example retrieves information about the specified version of the specified group. To retrieve the IDs of all versions of the group, use the ``list-group-versions`` command. To retrieve the ID of the last version added to the group, use the ``get-group`` command and check the ``LatestVersion`` property. ::

    aws greengrass get-group-version \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"  \
        --group-version-id "115136b3-cfd7-4462-b77f-8741a4b00e5e"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/115136b3-cfd7-4462-b77f-8741a4b00e5e",
        "CreationTimestamp": "2019-06-18T17:04:30.915Z",
        "Definition": {
            "CoreDefinitionVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/c906ed39-a1e3-4822-a981-7b9bd57b4b46/versions/42aeeac3-fd9d-4312-a8fd-ffa9404a20e0",
            "FunctionDefinitionVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/9748fda7-1589-4fcc-ac94-f5559e88678b",
            "SubscriptionDefinitionVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152/versions/88ae8699-12ac-4663-ba3f-4d7f0519140b"
        },
        "Id": "1013db12-8b58-45ff-acc7-704248f66731",
        "Version": "115136b3-cfd7-4462-b77f-8741a4b00e5e"
    }
