**Example 1: To create an unfiltered view for the index in an AWS Region**

The following ``create-view`` example creates a view in the specified AWS Region that returns all results in the Region without any filtering. The view includes the optional Tags field on returned results. Because this view is created in the Region that contains the aggregator index, it can include results from all Regions in the account that contain a Resource Explorer index. ::

    aws resource-explorer-2 create-view \
        --view-name My-Main-View \
        --included-properties Name=tags \
        --region us-east-1

Output::

    {
        "View": {
            "Filters": {
                "FilterString": ""
            },
            "IncludedProperties": [
                {
                    "Name": "tags"
                }
            ],
            "LastUpdatedAt": "2022-07-13T20:34:11.314000+00:00",
            "Owner": "123456789012",
            "Scope": "arn:aws:iam::123456789012:root",
            "ViewArn": "arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-Main-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111"
        }
    }

**Example 2: To create a view that returns only resources associated with Amazon EC2**

The following ``create-view`` creates a view in AWS Region ``us-east-1`` that returns only those resources in the Region that are associated with the Amazon EC2 service. The view includes the optional ``Tags`` field on returned results. Because this view is created in the Region that contains the aggregator index, it can include results from all Regions in the account that contain a Resource Explorer index. ::

    aws resource-explorer-2 create-view \
        --view-name My-EC2-Only-View \
        --included-properties Name=tags \
        --filters FilterString="service:ec2" \
        --region us-east-1

Output::

    {
        "View": {
            "Filters": {
                "FilterString": "service:ec2"
            },
            "IncludedProperties": [
                {
                    "Name":"tags"
                }
            ],
            "LastUpdatedAt": "2022-07-13T21:35:09.059Z",
            "Owner": "123456789012",
            "Scope": "arn:aws:iam::123456789012:root",
            "ViewArn": "arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222"
        }
    }

For more information, see `Creating views for search <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-create.html>`__ in the *AWS Resource Explorer Users Guide*.