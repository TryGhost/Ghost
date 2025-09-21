**To set data protection policy**

**Example 1: To deny publishers from publishing messages with CreditCardNumber**

The following ``put-data-protection-policy`` example denies publishers from publishing messages with CreditCardNumber. ::

    aws sns put-data-protection-policy \
        --resource-arn arn:aws:sns:us-east-1:123456789012:mytopic \
        --data-protection-policy "{\"Name\":\"data_protection_policy\",\"Description\":\"Example data protection policy\",\"Version\":\"2021-06-01\",\"Statement\":[{\"DataDirection\":\"Inbound\",\"Principal\":[\"*\"],\"DataIdentifier\":[\"arn:aws:dataprotection::aws:data-identifier/CreditCardNumber\"],\"Operation\":{\"Deny\":{}}}]}"

This command produces no output.

**Example 2: To load parameters from a file**

The following ``put-data-protection-policy`` loads parameters from a file. ::

    aws sns put-data-protection-policy \
        --resource-arn arn:aws:sns:us-west-2:123456789012:MyTopic \
        --data-protection-policy file://policy.json

This command produces no output.
