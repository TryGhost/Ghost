**To delete an access point**

The following ``delete-access-point`` example deletes an access point named ``finance-ap`` in account 123456789012. Before running this example, replace the access point name and account number with appropriate values for your use case. ::

    aws s3control delete-access-point \
        --account-id 123456789012 \
        --name finance-ap

This command produces no output.

For more information, see `Managing Data Access with Amazon S3 Access Points <https://docs.aws.amazon.com/AmazonS3/latest/dev/access-points.html>`__ in the *Amazon Simple Storage Service Developer Guide*.
