**To describe a user pool**

The following example describes a user pool with the user pool id us-west-2_EXAMPLE. ::

    aws cognito-idp describe-user-pool \
        --user-pool-id us-west-2_EXAMPLE

Output::

    {
        "UserPool": {
            "Id": "us-west-2_EXAMPLE",
            "Name": "MyUserPool",
            "Policies": {
                "PasswordPolicy": {
                    "MinimumLength": 8,
                    "RequireUppercase": true,
                    "RequireLowercase": true,
                    "RequireNumbers": true,
                    "RequireSymbols": true,
                    "TemporaryPasswordValidityDays": 1
                }
            },
            "DeletionProtection": "ACTIVE",
            "LambdaConfig": {
                "PreSignUp": "arn:aws:lambda:us-west-2:123456789012:function:MyPreSignUpFunction",
                "CustomMessage": "arn:aws:lambda:us-west-2:123456789012:function:MyCustomMessageFunction",
                "PostConfirmation": "arn:aws:lambda:us-west-2:123456789012:function:MyPostConfirmationFunction",
                "PreAuthentication": "arn:aws:lambda:us-west-2:123456789012:function:MyPreAuthenticationFunction",
                "PostAuthentication": "arn:aws:lambda:us-west-2:123456789012:function:MyPostAuthenticationFunction",
                "DefineAuthChallenge": "arn:aws:lambda:us-west-2:123456789012:function:MyDefineAuthChallengeFunction",
                "CreateAuthChallenge": "arn:aws:lambda:us-west-2:123456789012:function:MyCreateAuthChallengeFunction",
                "VerifyAuthChallengeResponse": "arn:aws:lambda:us-west-2:123456789012:function:MyVerifyAuthChallengeFunction",
                "PreTokenGeneration": "arn:aws:lambda:us-west-2:123456789012:function:MyPreTokenGenerationFunction",
                "UserMigration": "arn:aws:lambda:us-west-2:123456789012:function:MyMigrateUserFunction",
                "PreTokenGenerationConfig": {
                    "LambdaVersion": "V2_0",
                    "LambdaArn": "arn:aws:lambda:us-west-2:123456789012:function:MyPreTokenGenerationFunction"
                },
                "CustomSMSSender": {
                    "LambdaVersion": "V1_0",
                    "LambdaArn": "arn:aws:lambda:us-west-2:123456789012:function:MyCustomSMSSenderFunction"
                },
                "CustomEmailSender": {
                    "LambdaVersion": "V1_0",
                    "LambdaArn": "arn:aws:lambda:us-west-2:123456789012:function:MyCustomEmailSenderFunction"
                },
                "KMSKeyID": "arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
            },
            "LastModifiedDate": 1726784814.598,
            "CreationDate": 1602103465.273,
            "SchemaAttributes": [
                {
                    "Name": "sub",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": false,
                    "Required": true,
                    "StringAttributeConstraints": {
                        "MinLength": "1",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "name",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "given_name",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "family_name",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "middle_name",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "nickname",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "preferred_username",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "profile",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "picture",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "website",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "email",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": true,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "email_verified",
                    "AttributeDataType": "Boolean",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false
                },
                {
                    "Name": "gender",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "birthdate",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "10",
                        "MaxLength": "10"
                    }
                },
                {
                    "Name": "zoneinfo",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "locale",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "phone_number",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "phone_number_verified",
                    "AttributeDataType": "Boolean",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false
                },
                {
                    "Name": "address",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "0",
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "updated_at",
                    "AttributeDataType": "Number",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "NumberAttributeConstraints": {
                        "MinValue": "0"
                    }
                },
                {
                    "Name": "identities",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {}
                },
                {
                    "Name": "custom:111",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "1",
                        "MaxLength": "256"
                    }
                },
                {
                    "Name": "dev:custom:222",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": true,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MinLength": "1",
                        "MaxLength": "421"
                    }
                },
                {
                    "Name": "custom:accesstoken",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MaxLength": "2048"
                    }
                },
                {
                    "Name": "custom:idtoken",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": false,
                    "Mutable": true,
                    "Required": false,
                    "StringAttributeConstraints": {
                        "MaxLength": "2048"
                    }
                }
            ],
            "AutoVerifiedAttributes": [
                "email"
            ],
            "SmsVerificationMessage": "Your verification code is {####}. ",
            "EmailVerificationMessage": "Your verification code is {####}. ",
            "EmailVerificationSubject": "Your verification code",
            "VerificationMessageTemplate": {
                "SmsMessage": "Your verification code is {####}. ",
                "EmailMessage": "Your verification code is {####}. ",
                "EmailSubject": "Your verification code",
                "EmailMessageByLink": "Please click the link below to verify your email address. <b>{##Verify Your Email##}</b>\n this is from us-west-2_ywDJHlIfU",
                "EmailSubjectByLink": "Your verification link",
                "DefaultEmailOption": "CONFIRM_WITH_LINK"
            },
            "SmsAuthenticationMessage": "Your verification code is {####}. ",
            "UserAttributeUpdateSettings": {
                "AttributesRequireVerificationBeforeUpdate": []
            },
            "MfaConfiguration": "OPTIONAL",
            "DeviceConfiguration": {
                "ChallengeRequiredOnNewDevice": true,
                "DeviceOnlyRememberedOnUserPrompt": false
            },
            "EstimatedNumberOfUsers": 166,
            "EmailConfiguration": {
                "SourceArn": "arn:aws:ses:us-west-2:123456789012:identity/admin@example.com",
                "EmailSendingAccount": "DEVELOPER"
            },
            "SmsConfiguration": {
                "SnsCallerArn": "arn:aws:iam::123456789012:role/service-role/userpool-SMS-Role",
                "ExternalId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "SnsRegion": "us-west-2"
            },
            "UserPoolTags": {},
            "Domain": "myCustomDomain",
            "CustomDomain": "auth.example.com",
            "AdminCreateUserConfig": {
                "AllowAdminCreateUserOnly": false,
                "UnusedAccountValidityDays": 1,
                "InviteMessageTemplate": {
                    "SMSMessage": "Your username is {username} and temporary password is {####}. ",
                    "EmailMessage": "Your username is {username} and temporary password is {####}. ",
                    "EmailSubject": "Your temporary password"
                }
            },
            "UserPoolAddOns": {
                "AdvancedSecurityMode": "ENFORCED",
                "AdvancedSecurityAdditionalFlows": {}
            },
            "Arn": "arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_EXAMPLE",
            "AccountRecoverySetting": {
                "RecoveryMechanisms": [
                    {
                        "Priority": 1,
                        "Name": "verified_email"
                    }
                ]
            }
        }
    }

For more information, see `Amazon Cognito user pools <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html>`__ in the *Amazon Cognito Developer Guide*.
