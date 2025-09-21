**To set a tag on an object**

The following ``put-object-tagging`` example sets a tag with the key ``designation`` and the value ``confidential`` on the specified object. ::

    aws s3api put-object-tagging \
        --bucket amzn-s3-demo-bucket \
        --key doc1.rtf \
        --tagging '{"TagSet": [{ "Key": "designation", "Value": "confidential" }]}'

This command produces no output.

The following ``put-object-tagging`` example sets multiple tags sets on the specified object. ::

    aws s3api put-object-tagging \
        --bucket amzn-s3-demo-bucket-example \
        --key doc3.rtf \
        --tagging '{"TagSet": [{ "Key": "designation", "Value": "confidential" }, { "Key": "department", "Value": "finance" }, { "Key": "team", "Value": "payroll" } ]}'

This command produces no output.
