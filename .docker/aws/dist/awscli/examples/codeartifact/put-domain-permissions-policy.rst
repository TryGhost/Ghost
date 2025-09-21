**To attach a permissions policy to a domain**

The following ``put-domain-permissions-policy`` example attaches a permission policy that is defined in the policy.json file to a domain named test-domain. ::

    aws codeartifact put-domain-permissions-policy \
        --domain test-domain \
        --policy-document file://PATH/TO/policy.json

Output::

    {
        "policy": {
            "resourceArn": "arn:aws:codeartifact:region-id:111122223333:domain/test-domain",
            "document": "{ ...policy document content...}",
            "revision": "MQlyyTQRASRU3HB58gBtSDHXG7Q3hvxxxxxxx="
        }
    }

For more information, see `Set a domain policy <https://docs.aws.amazon.com/codeartifact/latest/ug/domain-policies.html#set-domain-policy>`__ in the *AWS CodeArtifact User Guide*.