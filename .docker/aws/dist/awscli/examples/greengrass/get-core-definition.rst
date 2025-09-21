**To retrieve details for a Greengrass core definition**

The following ``get-core-definition`` example retrieves information about the specified core definition. To retrieve the IDs of your core definitions, use the ``list-core-definitions`` command. ::

    aws greengrass get-core-definition \
        --core-definition-id "c906ed39-a1e3-4822-a981-7b9bd57b4b46"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/237d6916-27cf-457f-ba0c-e86cfb5d25cd",
        "CreationTimestamp": "2018-10-18T04:47:06.721Z",
        "Id": "237d6916-27cf-457f-ba0c-e86cfb5d25cd",
        "LastUpdatedTimestamp": "2018-10-18T04:47:06.721Z",
        "LatestVersion": "bd2cd6d4-2bc5-468a-8962-39e071e34b68",
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/237d6916-27cf-457f-ba0c-e86cfb5d25cd/versions/bd2cd6d4-2bc5-468a-8962-39e071e34b68",
        "tags": {}
    }
