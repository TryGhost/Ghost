**To update an Amazon Kendra index**

The following ``update-index`` updates the configuration of an Amazon Kendra index. If the action is successful, the service either sends back no output, the HTTP status code 200, or the AWS CLI return code 0. You can use ``describe-index`` to view the configuration and status of an index. ::

    aws kendra update-index \
        --id enterpriseindex1 \
        --name "new name for Enterprise Edition index 1" \
        --description "new description for Enterprise Edition index 1" \
        --role-arn arn:aws:iam::my-account-id:role/KendraNewRoleForEnterpriseIndex \
        --capacity-units '{"QueryCapacityUnits": 2, "StorageCapacityUnits": 1}' \
        --document-metadata-configuration-updates '{"Name": "_document_title", "Relevance": {"Importance": 6}}, {"Name": "_last_updated_at", "Relevance": {"Importance": 8}}' \
        --user-context-policy "USER_TOKEN" \
        --user-token-configurations '{"JsonTokenTypeConfiguration": {"GroupAttributeField": "groupNameField", "UserNameAttributeField": "userNameField"}}'

This command produces no output.

For more information, see `Getting started with an Amazon Kendra index and data source connector <https://docs.aws.amazon.com/kendra/latest/dg/getting-started.html>`__ in the *Amazon Kendra Developer Guide*.