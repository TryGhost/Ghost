**To list the tags attached to a server certificate**

The following ``list-server-certificate-tags`` command retrieves the list of tags associated with the specified server certificate. ::

    aws iam list-server-certificate-tags \
        --server-certificate-name ExampleCertificate

Output::

    {
        "Tags": [
            {
                "Key": "DeptID",
                "Value": "123456"
            },
            {
                "Key": "Department",
                "Value": "Accounting"
            }
        ]
    }

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.