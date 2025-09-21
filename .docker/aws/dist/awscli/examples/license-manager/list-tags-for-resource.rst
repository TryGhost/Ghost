**To list the tags for a license configuration**

The following ``list-tags-for-resource`` example lists the tags for the specified license configuration. ::

    aws license-manager list-tags-for-resource \
        --resource-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-6eb6586f508a786a2ba4f56c1EXAMPLE

Output::

    {
        "Tags": [
            {
                "Key": "project",
                "Value": "lima"
            }
        ]
    }
