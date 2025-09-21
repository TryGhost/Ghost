**To start a policy generation request**

The following ``start-policy-generation`` example starts a policy generation request in your AWS account. ::

    aws accessanalyzer start-policy-generation \
        --policy-generation-details '{"principalArn":"arn:aws:iam::111122223333:role/Admin"}' \
        --cloud-trail-details file://myfile.json

Contents of ``myfile.json``::

    {
        "accessRole": "arn:aws:iam::111122223333:role/service-role/AccessAnalyzerMonitorServiceRole",
        "startTime": "2024-02-13T00:30:00Z",
        "trails": [
            {
                "allRegions": true,
                "cloudTrailArn": "arn:aws:cloudtrail:us-west-2:111122223333:trail/my-trail"
            }
        ]
    }

Output::

    {
        "jobId": "c557dc4a-0338-4489-95dd-739014860ff9"
    }

For more information, see `IAM Access Analyzer policy generation <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html>`__ in the *AWS IAM User Guide*.