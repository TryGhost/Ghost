**To retrieves the metadata about a share of a HealthOmics analytics data**

The following ``get-share`` example retrieves the metadata for a cross-account share of analytics data. ::

    aws omics get-share \
        --share-id "495c21bedc889d07d0ab69d710a6841e-dd75ab7a1a9c384fa848b5bd8e5a7e0a"

Output::

    {
        "share": {
            "shareId": "495c21bedc889d07d0ab69d710a6841e-dd75ab7a1a9c384fa848b5bd8e5a7e0a",
            "name": "my_Share-123",
            "resourceArn": "arn:aws:omics:us-west-2:555555555555:variantStore/omics_dev_var_store",
            "principalSubscriber": "123456789012",
            "ownerId": "555555555555",
            "status": "PENDING"
        }
    }

For more information, see `Cross-account sharing <https://docs.aws.amazon.com/omics/latest/dev/cross-account-sharing.html>`__ in the *AWS HealthOmics User Guide*.