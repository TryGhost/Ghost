**To deregister data lake storage**

The following ``deregister-resource`` example deregisters the resource as managed by the Lake Formation. ::

    aws lakeformation deregister-resource \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ResourceArn": "arn:aws:s3:::lf-emr-athena-result-123"
    }

This command produces no output.

For more information, see `Adding an Amazon S3 location to your data lake <https://docs.aws.amazon.com/lake-formation/latest/dg/register-data-lake.html>`__ in the *AWS Lake Formation Developer Guide*.
