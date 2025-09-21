**To create an access point**

The following ``create-access-point`` example creates an access point named ``finance-ap`` for the bucket ``business-records`` in account 123456789012. Before running this example, replace the access point name, bucket name, and account number with appropriate values for your use case. ::

    aws s3control create-access-point \
        --account-id 123456789012 \
        --bucket business-records \
        --name finance-ap

This command produces no output.

For more information, see `Creating Access Points <https://docs.aws.amazon.com/AmazonS3/latest/dev/creating-access-points.html>`__ in the *Amazon Simple Storage Service Developer Guide*.
