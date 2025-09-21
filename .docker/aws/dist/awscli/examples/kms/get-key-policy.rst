**To copy a key policy from one KMS key to another KMS key**

The following ``get-key-policy`` example gets the key policy from one KMS key and saves it in a text file. Then, it replaces the policy of a different KMS key using the text file as the policy input.

Because the ``--policy`` parameter of ``put-key-policy`` requires a string, you must use the ``--output text`` option to return the output as a text string instead of JSON. ::

    aws kms get-key-policy \
        --policy-name default \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --query Policy \
        --output text > policy.txt

    aws kms put-key-policy \
        --policy-name default \
        --key-id 0987dcba-09fe-87dc-65ba-ab0987654321 \
        --policy file://policy.txt

This command produces no output.

For more information, see `PutKeyPolicy <https://docs.aws.amazon.com/kms/latest/APIReference/API_PutKeyPolicy.html>`__ in the *AWS KMS API Reference*.
