**To retrieve information about a Greengrass group**

The following ``get-group`` example retrieves information about the specified Greengrass group. To retrieve the IDs of your groups, use the ``list-groups`` command. ::

    aws greengrass get-group \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731",
        "CreationTimestamp": "2019-06-18T16:21:21.457Z",
        "Id": "1013db12-8b58-45ff-acc7-704248f66731",
        "LastUpdatedTimestamp": "2019-06-18T16:21:21.457Z",
        "LatestVersion": "115136b3-cfd7-4462-b77f-8741a4b00e5e",
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/115136b3-cfd7-4462-b77f-8741a4b00e5e",
        "Name": "GGGroup4Pi3",
        "tags": {}
    }
