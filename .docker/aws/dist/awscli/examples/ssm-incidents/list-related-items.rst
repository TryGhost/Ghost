**To list related items**

The following ``list-related-items`` example lists the related items of the specified incident. ::

    aws ssm-incidents list-related-items \
        --incident-record-arn "arn:aws:ssm-incidents::111122223333:incident-record/Example-Response-Plan/6ebcc812-85f5-b7eb-8b2f-283e4d844308"

Output::

    {
        "relatedItems": [
            {
                "identifier": {
                    "type": "OTHER",
                    "value": {
                        "url": "https://console.aws.amazon.com/systems-manager/opsitems/oi-8ef82158e190/workbench?region=us-east-1"
                    }
                },
                "title": "Example related item"
            },
            {
                "identifier": {
                    "type": "PARENT",
                    "value": {
                        "arn": "arn:aws:ssm:us-east-1:111122223333:opsitem/oi-8084126392ac"
                    }
                },
                "title": "parentItem"
            }
        ]
    }

For more information, see `Incident details <https://docs.aws.amazon.com/incident-manager/latest/userguide/tracking-details.html>`__ in the *Incident Manager User Guide*.