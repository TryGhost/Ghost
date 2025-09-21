**To retrieve information about a specific version of a resource definition**

The following ``get-resource-definition-version`` example retrieves information about the specified version of the specified resource definition. To retrieve the IDs of all versions of the resource definition, use the ``list-resource-definition-versions`` command. To retrieve the ID of the last version added to the resource definition, use the ``get-resource-definition`` command and check the ``LatestVersion`` property. ::

    aws greengrass get-resource-definition-version \
        --resource-definition-id "ad8c101d-8109-4b0e-b97d-9cc5802ab658" \
        --resource-definition-version-id "26e8829a-491a-464d-9c87-664bf6f6f2be"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658/versions/26e8829a-491a-464d-9c87-664bf6f6f2be",
        "CreationTimestamp": "2019-06-19T16:40:59.392Z",
        "Definition": {
            "Resources": [
                {
                    "Id": "26ff3f7b-839a-4217-9fdc-a218308b3963",
                    "Name": "usb-port",
                    "ResourceDataContainer": {
                        "LocalDeviceResourceData": {
                            "GroupOwnerSetting": {
                                "AutoAddGroupOwner": false
                            },
                            "SourcePath": "/dev/bus/usb"
                        }
                    }
                }
            ]
        },
        "Id": "ad8c101d-8109-4b0e-b97d-9cc5802ab658",
        "Version": "26e8829a-491a-464d-9c87-664bf6f6f2be"
    }
