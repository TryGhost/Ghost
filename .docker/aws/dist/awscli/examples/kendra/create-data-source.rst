**To create an Amazon Kendra data source connector**

The following ``create-data-source`` creates and configures an Amazon Kendra data source connector. You can use ``describe-data-source`` to view the status of a data source connector, and read any error messages if the status shows a data source connector "FAILED" to completely create. ::

    aws kendra create-data-source \
        --name "example data source 1" \
        --description "Example data source 1 for example index 1 contains the first set of example documents" \
        --tags '{"Key": "test resources", "Value": "kendra"}, {"Key": "test resources", "Value": "aws"}' \
        --role-arn "arn:aws:iam::my-account-id:role/KendraRoleForS3TemplateConfigDataSource" \
        --index-id exampleindex1 \
        --language-code "es" \
        --schedule "0 0 18 ? * TUE,MON,WED,THU,FRI,SAT *" \
        --configuration '{"TemplateConfiguration": {"Template": file://s3schemaconfig.json}}' \
        --type "TEMPLATE" \
        --custom-document-enrichment-configuration '{"PostExtractionHookConfiguration": {"LambdaArn": "arn:aws:iam::my-account-id:function/my-function-ocr-docs", "S3Bucket": "s3://amzn-s3-demo-bucket/scanned-image-text-example-docs"}, "RoleArn": "arn:aws:iam:my-account-id:role/KendraRoleForCDE"}' \
        --vpc-configuration '{"SecurityGroupIds": ["sg-1234567890abcdef0"], "SubnetIds": ["subnet-1c234","subnet-2b134"]}'

Output::

    {
        "Id": "exampledatasource1"
    }

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.