**Example 1: To register data lake storage using Service Linked Role**

The following ``register-resource`` example registers the resource as managed by the Lake Formation using Service linked role. ::

    aws lakeformation register-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ResourceArn": "arn:aws:s3:::lf-emr-athena-result-123",
        "UseServiceLinkedRole": true
    }

This command produces no output.

For more information, see `Adding an Amazon S3 location to your data lake <https://docs.aws.amazon.com/lake-formation/latest/dg/register-data-lake.html>`__ in the *AWS Lake Formation Developer Guide*.

**Example 2: To register data lake storage using custom role**

The following ``register-resource`` example registers the resource as managed by the Lake Formation using custom role. ::

    aws lakeformation register-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ResourceArn": "arn:aws:s3:::lf-emr-athena-result-123",
        "UseServiceLinkedRole": false,
        "RoleArn": "arn:aws:iam::123456789111:role/LF-GlueServiceRole"
    }

This command produces no output.

For more information, see `Adding an Amazon S3 location to your data lake <https://docs.aws.amazon.com/lake-formation/latest/dg/register-data-lake.html>`__ in the *AWS Lake Formation Developer Guide*.
