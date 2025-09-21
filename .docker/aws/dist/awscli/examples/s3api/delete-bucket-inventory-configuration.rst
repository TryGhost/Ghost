**To delete the inventory configuration of a bucket**

The following ``delete-bucket-inventory-configuration`` example deletes the inventory configuration with ID ``1`` for the specified bucket. ::

    aws s3api delete-bucket-inventory-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 1

This command produces no output.
