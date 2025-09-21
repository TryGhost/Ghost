**To list the Resource Explorer views available in an AWS Region**

The following ``list-views`` example lists all of the views available in the Region in which you invoke the operation. ::

    aws resource-explorer-2 list-views

Output::

    {
        "Views": [
            "arn:aws:resource-explorer-2:us-east-1:123456789012:view/EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111",
            "arn:aws:resource-explorer-2:us-east-1:123456789012:view/Default-All-Resources-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222",
            "arn:aws:resource-explorer-2:us-east-1:123456789012:view/Production-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE33333"
        ]
    }

For more information about views, see `About Resource Explorer views <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-about.html>`__ in the *AWS Resource Explorer Users Guide*.