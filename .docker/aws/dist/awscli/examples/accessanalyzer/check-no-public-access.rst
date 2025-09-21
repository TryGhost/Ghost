**To check whether a resource policy can grant public access to the specified resource type**

The following ``check-no-public-access`` example checks whether a resource policy can grant public access to the specified resource type. ::

    aws accessanalyzer check-no-public-access \
        --policy-document file://check-no-public-access-myfile.json \
        --resource-type AWS::S3::Bucket

Contents of ``myfile.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "CheckNoPublicAccess",
                "Effect": "Allow",
                "Principal": { "AWS": "arn:aws:iam::111122223333:user/JohnDoe" },
                "Action": [
                    "s3:GetObject"
                ]
            }
        ]
    }

Output::

    {
        "result": "PASS",
        "message": "The resource policy does not grant public access for the given resource type."
    }

For more information, see `Previewing access with IAM Access Analyzer APIs <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-preview-access-apis.html>`__ in the *AWS IAM User Guide*.
