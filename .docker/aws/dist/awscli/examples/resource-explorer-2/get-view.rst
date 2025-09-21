**To retrieve details about a Resource Explorer view**

The following ``get-view`` example displays the details about a view specified by its ARN. ::

    aws resource-explorer-2 get-view \
        --view-arn arn:aws:resource-explorer-2:us-east-1:123456789012:view/EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111

Output::

    {
      "Tags" : {},
      "View" : {
            "Filters" : {
                "FilterString" : "service:ec2"
            },
            "IncludedProperties" : [ 
                {
                    "Name" : "tags"
                }
            ],
            "LastUpdatedAt" : "2022-07-13T21:33:45.249Z",
            "Owner" : "123456789012",
            "Scope" : "arn:aws:iam::123456789012:root",
            "ViewArn" : "arn:aws:resource-explorer-2:us-east-1:123456789012:view/EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111"
      }
    }

For more information about views, see `About Resource Explorer views <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-about.html>`__ in the *AWS Resource Explorer Users Guide*.