**To initiate a document version upload**

The following ``initiate-document-upload`` example creates a new document object and version object. ::

    aws workdocs initiate-document-version-upload \
        --name exampledocname \
        --parent-folder-id eacd546d952531c633452ed67cac23161aa0d5df2e8061223a59e8f67e7b6189

Output::

    {
        "Metadata": {
            "Id": "feaba64d4efdf271c2521b60a2a44a8f057e84beaabbe22f01267313209835f2",
            "CreatorId": "S-1-1-11-1111111111-2222222222-3333333333-3333&d-926726012c",
            "ParentFolderId": "eacd546d952531c633452ed67cac23161aa0d5df2e8061223a59e8f67e7b6189",
            "CreatedTimestamp": 1536773972.914,
            "ModifiedTimestamp": 1536773972.914,
            "LatestVersionMetadata": {
                "Id": "1536773972914-ddb67663e782e7ce8455ebc962217cf9f9e47b5a9a702e5c84dcccd417da9313",
                "Name": "exampledocname",
                "ContentType": "application/octet-stream",
                "Size": 0,
                "Status": "INITIALIZED",
                "CreatedTimestamp": 1536773972.914,
                "ModifiedTimestamp": 1536773972.914,
                "CreatorId": "arn:aws:iam::123456789123:user/EXAMPLE"
            },
            "ResourceState": "ACTIVE"
        },
        "UploadMetadata": {
            "UploadUrl": "https://gb-us-west-2-prod-doc-source.s3.us-west-2.amazonaws.com/feaba64d4efdf271c2521b60a2a44a8f057e84beaabbe22f01267313209835f2/1536773972914-ddb67663e782e7ce8455ebc962217cf9f9e47b5a9a702e5c84dcccd417da9313?X-Amz-Algorithm=AWS1-ABCD-EFG234&X-Amz-Date=20180912T173932Z&X-Amz-SignedHeaders=content-type%3Bhost%3Bx-amz-server-side-encryption&X-Amz-Expires=899&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20180912%2Fus-west-2%2Fs3%2Faws1_request&X-Amz-Signature=01Ab2c34d567e8f90123g456hi78j901k2345678l901234mno56pqr78EXAMPLE",
            "SignedHeaders": {
                "Content-Type": "application/octet-stream",
                "x-amz-server-side-encryption": "ABC123"
            }
        }
    }
