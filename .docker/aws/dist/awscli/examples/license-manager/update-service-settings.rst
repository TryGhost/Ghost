**To update the License Manager settings**

The following ``update-service-settings`` example enables cross-account resource discovery for License Manager in the current AWS Region. The Amazon S3 bucket is the Resource Data Sync required for Systems Manager inventory. ::

    aws license-manager update-service-settings \
        --organization-configuration EnableIntegration=true \
        --enable-cross-accounts-discovery \
        --s3-bucket-arn arn:aws:s3:::aws-license-manager-service-abcd1234EXAMPLE

This command produces no output.
