**To create a share of a HealthOmics analytics store**

The following ``create-share`` example shows how to create a share of a HealthOmics analytics store that can be accepted by a subscriber outside the account. ::

    aws omics create-share \
        --resource-arn "arn:aws:omics:us-west-2:555555555555:variantStore/omics_dev_var_store" \
        --principal-subscriber "123456789012" \
        --name "my_Share-123"

Output::

    {
        "shareId": "495c21bedc889d07d0ab69d710a6841e-dd75ab7a1a9c384fa848b5bd8e5a7e0a",
        "name": "my_Share-123",
        "status": "PENDING"
    }

For more information, see `Cross-acount sharing <https://docs.aws.amazon.com/omics/latest/dev/cross-account-sharing.html>`__ in the *AWS HealthOmics User Guide*.