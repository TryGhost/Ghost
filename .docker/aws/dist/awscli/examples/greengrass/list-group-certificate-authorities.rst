**To list the current CAs for a group**

The following ``list-group-certificate-authorities`` example lists the current certificate authorities (CAs) for the specified Greengrass group. ::

    aws greengrass list-group-certificate-authorities \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"
    
Output::

    {
        "GroupCertificateAuthorities": [
            {
                "GroupCertificateAuthorityArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/certificateauthorities/f0430e1736ea8ed30cc5d5de9af67a7e3586bad9ae4d89c2a44163f65fdd8cf6",
                "GroupCertificateAuthorityId": "f0430e1736ea8ed30cc5d5de9af67a7e3586bad9ae4d89c2a44163f65fdd8cf6"
            }
        ]
    }
