**To run an on-demand evaluation for AWS Config rules**

The following command starts an evaluation for two AWS managed rules::

    aws configservice start-config-rules-evaluation --config-rule-names s3-bucket-versioning-enabled cloudtrail-enabled