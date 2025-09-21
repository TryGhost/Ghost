**To retrieve details about a specific version of the Greengrass core definition**

The following ``get-core-definition-version`` example retrieves information about the specified version of the specified core definition. To retrieve the IDs of all versions of the core definition, use the ``list-core-definition-versions`` command. To retrieve the ID of the last version added to the core definition, use the ``get-core-definition`` command and check the ``LatestVersion`` property. ::

    aws greengrass get-core-definition-version \
        --core-definition-id "c906ed39-a1e3-4822-a981-7b9bd57b4b46"  \
        --core-definition-version-id "42aeeac3-fd9d-4312-a8fd-ffa9404a20e0"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/c906ed39-a1e3-4822-a981-7b9bd57b4b46/versions/42aeeac3-fd9d-4312-a8fd-ffa9404a20e0",
        "CreationTimestamp": "2019-06-18T16:21:21.351Z",
        "Definition": {
            "Cores": [
                {
                    "CertificateArn": "arn:aws:iot:us-west-2:123456789012:cert/928dea7b82331b47c3ff77b0e763fc5e64e2f7c884e6ef391baed9b6b8e21b45",
                    "Id": "1a39aac7-0885-4417-91f6-23e4cea6c511",
                    "SyncShadow": false,
                    "ThingArn": "arn:aws:iot:us-west-2:123456789012:thing/GGGroup4Pi3_Core"
                }
            ]
        },
        "Id": "c906ed39-a1e3-4822-a981-7b9bd57b4b46",
        "Version": "42aeeac3-fd9d-4312-a8fd-ffa9404a20e0"
    }
