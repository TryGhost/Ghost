**To update an Amazon Kendra data source connector**

The following ``update-data-source`` updates the configuration of an Amazon Kendra data source connector. If the action is successful, the service either sends back no output, the HTTP status code 200, or the AWS CLI return code 0. You can use ``describe-data-source`` to view the configuration and status of a data source connector. ::

    aws kendra update-data-source \
        --id exampledatasource1 \
        --index-id exampleindex1 \
        --name "new name for example data source 1" \
        --description "new description for example data source 1" \
        --role-arn arn:aws:iam::my-account-id:role/KendraNewRoleForExampleDataSource \
        --configuration '{"TemplateConfiguration": {"Template": file://s3schemanewconfig.json}}' \
        --custom-document-enrichment-configuration '{"PostExtractionHookConfiguration": {"LambdaArn": "arn:aws:iam::my-account-id:function/my-function-ocr-docs", "S3Bucket": "s3://amzn-s3-demo-bucket/scanned-image-text-example-docs"}, "RoleArn": "arn:aws:iam:my-account-id:role/KendraNewRoleForCDE"}' \
        --language-code "es" \
        --schedule "0 0 18 ? * MON,WED,FRI *" \
        --vpc-configuration '{"SecurityGroupIds": ["sg-1234567890abcdef0"], "SubnetIds": ["subnet-1c234","subnet-2b134"]}'

This command produces no output.

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.