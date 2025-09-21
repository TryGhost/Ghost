**Example 1: To search using the default view**

The following ``search`` example displays all resources in the specified  that are associated with the  service. The search uses the default view for the Region. The example response includes a ``NextToken`` value, which indicates that there is more output available to retrieve with additional calls. ::

    aws resource-explorer-2 search \
        --query-string "service:iam"

Output::

    {
        "Count": {
            "Complete": true,
            "TotalResources": 55
        },
        "NextToken": "AG9VOEF1KLEXAMPLEOhJHVwo5chEXAMPLER5XiEpNrgsEXAMPLE...b0CmOFOryHEXAMPLE",
        "Resources": [{
            "Arn": "arn:aws:iam::123456789012:policy/service-role/Some-Policy-For-A-Service-Role",
            "LastReportedAt": "2022-07-21T12:34:42Z",
            "OwningAccountId": "123456789012",
            "Properties": [],
            "Region": "global",
            "ResourceType": "iam:policy",
            "Service": "iam"
        }, {
            "Arn": "arn:aws:iam::123456789012:policy/service-role/Another-Policy-For-A-Service-Role",
            "LastReportedAt": "2022-07-21T12:34:42Z",
            "OwningAccountId": "123456789012",
            "Properties": [],
            "Region": "global",
            "ResourceType": "iam:policy",
            "Service": "iam"
        }, {
           ... TRUNCATED FOR BREVITY ...
        }],
        "ViewArn": "arn:aws:resource-explorer-2:us-east-1:123456789012:view/my-default-view/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111"
    }

**Example 2: To search using a specified view**

The following ``search`` example search displays all resources ("*") in the specified AWS Region that are visible through the specified view. The results include only resources associated with Amazon EC2 because of the filters attached to the view. ::

    aws resource-explorer-2 search \
        -- query-string "*" \
        -- view-arn arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-EC2-view/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222

Output::

    HTTP/1.1 200 OK
    Date: Tue, 01 Nov 2022 20:00:59 GMT
    Content-Type: application/json
    Content-Length: <PayloadSizeBytes>

        {
            "Count": {
                "Complete": true,
                "TotalResources": 67
            },
            "Resources": [{
                "Arn": "arn:aws:ec2:us-east-1:123456789012:network-acl/acl-1a2b3c4d",
                "LastReportedAt": "2022-07-21T18:52:02Z",
                "OwningAccountId": "123456789012",
                "Properties": [{
                    "Data": [{
                        "Key": "Department",
                        "Value": "AppDevelopment"
                    }, {
                        "Key": "Environment",
                        "Value": "Production"
                    }],
                    "LastReportedAt": "2021-11-15T14:48:29Z",
                    "Name": "tags"
                }],
                "Region": "us-east-1",
                "ResourceType": "ec2:network-acl",
                "Service": "ec2"
            }, {
                "Arn": "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-1a2b3c4d",
                "LastReportedAt": "2022-07-21T21:22:23Z",
                "OwningAccountId": "123456789012",
                "Properties": [{
                    "Data": [{
                        "Key": "Department",
                        "Value": "AppDevelopment"
                    }, {
                        "Key": "Environment",
                        "Value": "Production"
                    }],
                    "LastReportedAt": "2021-07-29T19:02:39Z",
                    "Name": "tags"
                }],
                "Region": "us-east-1",
                "ResourceType": "ec2:subnet",
                "Service": "ec2"
            }, {
                "Arn": "arn:aws:ec2:us-east-1:123456789012:dhcp-options/dopt-1a2b3c4d",
                "LastReportedAt": "2022-07-21T06:08:53Z",
                "OwningAccountId": "123456789012",
                "Properties": [{
                    "Data": [{
                        "Key": "Department",
                        "Value": "AppDevelopment"
                    }, {
                        "Key": "Environment",
                        "Value": "Production"
                    }],
                    "LastReportedAt": "2021-11-15T15:11:05Z",
                    "Name": "tags"
                }],
                "Region": "us-east-1",
                "ResourceType": "ec2:dhcpoptions",
                "Service": "ec2"
            }, {
                ... TRUNCATED FOR BREVITY ...
            }],
            "ViewArn": "arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-EC2-view/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222"
        }

For more information, see `Using AWS Resource Explorer to search for resources <https://docs.aws.amazon.com/resource-explorer/latest/userguide/using-search.html>`__ in the *AWS Resource Explorer Users Guide*.