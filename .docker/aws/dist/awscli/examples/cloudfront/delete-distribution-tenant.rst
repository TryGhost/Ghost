**To delete a distribution tenant**

The following ``delete-distribution-tenant`` example deletes a distribution tenant with ETag ``ETVPDKIKX0DABC``. The distribution tenant must be disabled and can't be associated with any CloudFront resources. ::

    aws cloudfront delete-distribution-tenant \
        --id dt_2wjMUbg3NHZEQ7OfoalP5zi1AB \
        --if-match ETVPDKIKX0DABC

When successful, this command has no output.

For more information, see `Delete a distribution <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowToDeleteDistribution.html>`__ in the *Amazon CloudFront Developer Guide*.
