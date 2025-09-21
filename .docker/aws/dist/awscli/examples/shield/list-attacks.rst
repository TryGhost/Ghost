**To retrieve attack summaries from AWS Shield Advanced**

The following ``list-attacks`` example retrieves summaries of attacks for the specified AWS CloudFront distribution during the specified time period. The response includes attack IDs that you can provide to the ``describe-attack`` command for detailed information on an attack. ::

    aws shield list-attacks \
        --resource-arns arn:aws:cloudfront::12345678910:distribution/E1PXMP22ZVFAOR \
        --start-time FromInclusive=1529280000,ToExclusive=1529300000

Output::

    {
        "AttackSummaries": [
            {
                "AttackId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ResourceArn": "arn:aws:cloudfront::123456789012:distribution/E1PXMP22ZVFAOR",
                "StartTime": 1529280000.0,
                "EndTime": 1529449200.0,
                "AttackVectors": [
                    {
                        "VectorType": "SYN_FLOOD"
                    }
                ]
            }
        ]
    }

For more information, see `Reviewing DDoS Incidents <https://docs.aws.amazon.com/waf/latest/developerguide/using-ddos-reports.html>`__ in the *AWS Shield Advanced Developer Guide*.
