**To get information about an OU**

The following ``describe-organizational-unit`` example requests details about an OU. ::

    aws organizations describe-organizational-unit \
        --organizational-unit-id ou-examplerootid111-exampleouid111

Output::

    {
        "OrganizationalUnit": {
            "Name": "Accounting Group",
            "Arn": "arn:aws:organizations::123456789012:ou/o-exampleorgid/ou-examplerootid111-exampleouid111",
            "Id": "ou-examplerootid111-exampleouid111"
        }
    }