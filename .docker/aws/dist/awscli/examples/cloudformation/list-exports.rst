**To list exports**

The following ``list-exports`` example displays a list of the exports from stacks in the current region. ::

    aws cloudformation list-exports

Output::

    {
        "Exports": [
            {
                "ExportingStackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/private-vpc/99764070-b56c-xmpl-bee8-062a88d1d800",
                "Name": "private-vpc-subnet-a",
                "Value": "subnet-07b410xmplddcfa03"
            },
            {
                "ExportingStackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/private-vpc/99764070-b56c-xmpl-bee8-062a88d1d800",
                "Name": "private-vpc-subnet-b",
                "Value": "subnet-075ed3xmplebd2fb1"
            },
            {
                "ExportingStackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/private-vpc/99764070-b56c-xmpl-bee8-062a88d1d800",
                "Name": "private-vpc-vpcid",
                "Value": "vpc-011d7xmpl100e9841"
            }
        ]
    }
