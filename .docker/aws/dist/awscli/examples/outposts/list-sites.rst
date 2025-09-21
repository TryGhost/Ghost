**To list sites**

The following ``list-sites`` example lists the available Outpost sites in your AWS account. ::

    aws outposts list-sites

Output::

    {
        "Sites": [
            {
                "SiteId": "os-0ab12c3456EXAMPLE",
                "AccountId": "123456789012",
                "Name": "EXAMPLE",
                "Description": "example",
                "Tags": {}
            }
        ]
    }

For more information, see `Working with Outposts <https://docs.aws.amazon.com/outposts/latest/userguide/work-with-outposts.html>`__ in the *AWS Outposts User Guide*.
