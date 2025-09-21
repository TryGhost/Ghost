**To list the available shares of a HealthOmics analytics data**

The following ``list-shares`` example lists all shares that have been created for a resource-owner. ::

    aws omics list-shares \
        --resource-owner SELF

Output::

    {
        "shares": [
            {
                "shareId": "595c1cbd-a008-4eca-a887-954d30c91c6e",
                "name": "myShare",
                "resourceArn": "arn:aws:omics:us-west-2:555555555555:variantStore/store_1",
                "principalSubscriber": "123456789012",
                "ownerId": "555555555555",
                "status": "PENDING"
            }
            {
                "shareId": "39b65d0d-4368-4a19-9814-b0e31d73c10a",
                "name": "myShare3456",
                "resourceArn": "arn:aws:omics:us-west-2:555555555555:variantStore/store_2",
                "principalSubscriber": "123456789012",
                "ownerId": "555555555555",
                "status": "ACTIVE"
            },
            {
                "shareId": "203152f5-eef9-459d-a4e0-a691668d44ef",
                "name": "myShare4",
                "resourceArn": "arn:aws:omics:us-west-2:555555555555:variantStore/store_3",
                "principalSubscriber": "123456789012",
                "ownerId": "555555555555",
                "status": "ACTIVE"
            }
        ]
    }
        


For more information, see `Cross-account sharing <https://docs.aws.amazon.com/omics/latest/dev/cross-account-sharing.html>`__ in the *AWS HealthOmics User Guide*.