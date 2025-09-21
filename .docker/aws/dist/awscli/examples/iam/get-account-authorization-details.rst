**To list an AWS account's IAM users, groups, roles, and policies**

The following ``get-account-authorization-details`` command returns information about all IAM users, groups, roles, and policies in the AWS account. ::

    aws iam get-account-authorization-details

Output::

    {
        "RoleDetailList": [
            {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "",
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "ec2.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "RoleId": "AROA1234567890EXAMPLE",
                "CreateDate": "2014-07-30T17:09:20Z",
                "InstanceProfileList": [
                    {
                        "InstanceProfileId": "AIPA1234567890EXAMPLE",
                        "Roles": [
                            {
                                "AssumeRolePolicyDocument": {
                                    "Version": "2012-10-17",
                                    "Statement": [
                                        {
                                            "Sid": "",
                                            "Effect": "Allow",
                                            "Principal": {
                                                "Service": "ec2.amazonaws.com"
                                            },
                                            "Action": "sts:AssumeRole"
                                        }
                                    ]
                                },
                                "RoleId": "AROA1234567890EXAMPLE",
                                "CreateDate": "2014-07-30T17:09:20Z",
                                "RoleName": "EC2role",
                                "Path": "/",
                                "Arn": "arn:aws:iam::123456789012:role/EC2role"
                            }
                        ],
                        "CreateDate": "2014-07-30T17:09:20Z",
                        "InstanceProfileName": "EC2role",
                        "Path": "/",
                        "Arn": "arn:aws:iam::123456789012:instance-profile/EC2role"
                    }
                ],
                "RoleName": "EC2role",
                "Path": "/",
                "AttachedManagedPolicies": [
                    {
                        "PolicyName": "AmazonS3FullAccess",
                        "PolicyArn": "arn:aws:iam::aws:policy/AmazonS3FullAccess"
                    },
                    {
                        "PolicyName": "AmazonDynamoDBFullAccess",
                        "PolicyArn": "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
                    }
                ],
                "RoleLastUsed": {
                    "Region": "us-west-2",
                    "LastUsedDate": "2019-11-13T17:30:00Z"
                },
                "RolePolicyList": [],
                "Arn": "arn:aws:iam::123456789012:role/EC2role"
            }
        ],
        "GroupDetailList": [
            {
                "GroupId": "AIDA1234567890EXAMPLE",
                "AttachedManagedPolicies": {
                    "PolicyName": "AdministratorAccess",
                    "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess"
                },
                "GroupName": "Admins",
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:group/Admins",
                "CreateDate": "2013-10-14T18:32:24Z",
                "GroupPolicyList": []
            },
            {
                "GroupId": "AIDA1234567890EXAMPLE",
                "AttachedManagedPolicies": {
                    "PolicyName": "PowerUserAccess",
                    "PolicyArn": "arn:aws:iam::aws:policy/PowerUserAccess"
                },
                "GroupName": "Dev",
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:group/Dev",
                "CreateDate": "2013-10-14T18:33:55Z",
                "GroupPolicyList": []
            },
            {
                "GroupId": "AIDA1234567890EXAMPLE",
                "AttachedManagedPolicies": [],
                "GroupName": "Finance",
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:group/Finance",
                "CreateDate": "2013-10-14T18:57:48Z",
                "GroupPolicyList": [
                    {
                        "PolicyName": "policygen-201310141157",
                        "PolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Action": "aws-portal:*",
                                    "Sid": "Stmt1381777017000",
                                    "Resource": "*",
                                    "Effect": "Allow"
                                }
                            ]
                        }
                    }
                ]
            }
        ],
        "UserDetailList": [
            {
                "UserName": "Alice",
                "GroupList": [
                    "Admins"
                ],
                "CreateDate": "2013-10-14T18:32:24Z",
                "UserId": "AIDA1234567890EXAMPLE",
                "UserPolicyList": [],
                "Path": "/",
                "AttachedManagedPolicies": [],
                "Arn": "arn:aws:iam::123456789012:user/Alice"
            },
            {
                "UserName": "Bob",
                "GroupList": [
                    "Admins"
                ],
                "CreateDate": "2013-10-14T18:32:25Z",
                "UserId": "AIDA1234567890EXAMPLE",
                "UserPolicyList": [
                    {
                        "PolicyName": "DenyBillingAndIAMPolicy",
                        "PolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": {
                                "Effect": "Deny",
                                "Action": [
                                    "aws-portal:*",
                                    "iam:*"
                                ],
                                "Resource": "*"
                            }
                        }
                    }
                ],
                "Path": "/",
                "AttachedManagedPolicies": [],
                "Arn": "arn:aws:iam::123456789012:user/Bob"
            },
            {
                "UserName": "Charlie",
                "GroupList": [
                    "Dev"
                ],
                "CreateDate": "2013-10-14T18:33:56Z",
                "UserId": "AIDA1234567890EXAMPLE",
                "UserPolicyList": [],
                "Path": "/",
                "AttachedManagedPolicies": [],
                "Arn": "arn:aws:iam::123456789012:user/Charlie"
            }
        ],
        "Policies": [
            {
                "PolicyName": "create-update-delete-set-managed-policies",
                "CreateDate": "2015-02-06T19:58:34Z",
                "AttachmentCount": 1,
                "IsAttachable": true,
                "PolicyId": "ANPA1234567890EXAMPLE",
                "DefaultVersionId": "v1",
                "PolicyVersionList": [
                    {
                        "CreateDate": "2015-02-06T19:58:34Z",
                        "VersionId": "v1",
                        "Document": {
                            "Version": "2012-10-17",
                            "Statement": {
                                "Effect": "Allow",
                                "Action": [
                                    "iam:CreatePolicy",
                                    "iam:CreatePolicyVersion",
                                    "iam:DeletePolicy",
                                    "iam:DeletePolicyVersion",
                                    "iam:GetPolicy",
                                    "iam:GetPolicyVersion",
                                    "iam:ListPolicies",
                                    "iam:ListPolicyVersions",
                                    "iam:SetDefaultPolicyVersion"
                                ],
                                "Resource": "*"
                            }
                        },
                        "IsDefaultVersion": true
                    }
                ],
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:policy/create-update-delete-set-managed-policies",
                "UpdateDate": "2015-02-06T19:58:34Z"
            },
            {
                "PolicyName": "S3-read-only-specific-bucket",
                "CreateDate": "2015-01-21T21:39:41Z",
                "AttachmentCount": 1,
                "IsAttachable": true,
                "PolicyId": "ANPA1234567890EXAMPLE",
                "DefaultVersionId": "v1",
                "PolicyVersionList": [
                    {
                        "CreateDate": "2015-01-21T21:39:41Z",
                        "VersionId": "v1",
                        "Document": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "s3:Get*",
                                        "s3:List*"
                                    ],
                                    "Resource": [
                                        "arn:aws:s3:::amzn-s3-demo-bucket",
                                        "arn:aws:s3:::amzn-s3-demo-bucket/*"
                                    ]
                                }
                            ]
                        },
                        "IsDefaultVersion": true
                    }
                ],
                "Path": "/",
                "Arn": "arn:aws:iam::123456789012:policy/S3-read-only-specific-bucket",
                "UpdateDate": "2015-01-21T23:39:41Z"
            },
            {
                "PolicyName": "AmazonEC2FullAccess",
                "CreateDate": "2015-02-06T18:40:15Z",
                "AttachmentCount": 1,
                "IsAttachable": true,
                "PolicyId": "ANPA1234567890EXAMPLE",
                "DefaultVersionId": "v1",
                "PolicyVersionList": [
                    {
                        "CreateDate": "2014-10-30T20:59:46Z",
                        "VersionId": "v1",
                        "Document": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Action": "ec2:*",
                                    "Effect": "Allow",
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": "elasticloadbalancing:*",
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": "cloudwatch:*",
                                    "Resource": "*"
                                },
                                {
                                    "Effect": "Allow",
                                    "Action": "autoscaling:*",
                                    "Resource": "*"
                                }
                            ]
                        },
                        "IsDefaultVersion": true
                    }
                ],
                "Path": "/",
                "Arn": "arn:aws:iam::aws:policy/AmazonEC2FullAccess",
                "UpdateDate": "2015-02-06T18:40:15Z"
            }
        ],
        "Marker": "EXAMPLEkakv9BCuUNFDtxWSyfzetYwEx2ADc8dnzfvERF5S6YMvXKx41t6gCl/eeaCX3Jo94/bKqezEAg8TEVS99EKFLxm3jtbpl25FDWEXAMPLE",
        "IsTruncated": true
    }

For more information, see `AWS security audit guidelines <https://docs.aws.amazon.com/IAM/latest/UserGuide/security-audit-guide.html>`__ in the *AWS IAM User Guide*.