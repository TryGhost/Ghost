**To list tags for an accelerator**

The following ``list-tags-for-resource`` example lists the tags for a specific accelerator. ::

    aws globalaccelerator list-tags-for-resource \
        --accelerator-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh

Output::

    {
        "Tags": [
            {
                "Key": "Project",
                "Value": "A123456"
            }
        ]
    }

For more information, see `Tagging in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/tagging-in-global-accelerator.html>`__ in the *AWS Global Accelerator Developer Guide*.
