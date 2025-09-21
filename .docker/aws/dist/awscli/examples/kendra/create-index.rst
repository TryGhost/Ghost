**To create an Amazon Kendra index**

The following ``create-index`` creates and configures an Amazon Kendra index. You can use ``describe-index`` to view the status of an index, and read any error messages if the status shows an index "FAILED" to completely create. ::

    aws kendra create-index \
        --name "example index 1" \
        --description "Example index 1 contains the first set of example documents" \
        --tags '{"Key": "test resources", "Value": "kendra"}, {"Key": "test resources", "Value": "aws"}' \
        --role-arn "arn:aws:iam::my-account-id:role/KendraRoleForExampleIndex" \
        --edition "DEVELOPER_EDITION" \
        --server-side-encryption-configuration '{"KmsKeyId": "my-kms-key-id"}' \
        --user-context-policy "USER_TOKEN" \
        --user-token-configurations '{"JsonTokenTypeConfiguration": {"GroupAttributeField": "groupNameField", "UserNameAttributeField": "userNameField"}}'

Output::

    {
       "Id": index1
    }

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.