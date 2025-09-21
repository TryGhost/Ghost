**To get a list of compositions**

The following ``list-compositions`` lists all compositions for your AWS account, in the AWS region where the API request is processed. ::

    aws ivs-realtime list-compositions

Output::

    {
        "compositions": [
            {
                "arn": "arn:aws:ivs:ap-northeast-1:123456789012:composition/abcdABCDefgh",
                "destinations": [
                    {
                        "id": "AabBCcdDEefF",
                        "startTime": "2023-10-16T23:25:23+00:00",
                        "state": "ACTIVE"
                    }
                ],
                "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/defgABCDabcd",
                "startTime": "2023-10-16T23:25:21+00:00",
                "state": "ACTIVE",
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:ap-northeast-1:123456789012:composition/ABcdabCDefgh",
                "destinations": [
                    {
                        "endTime": "2023-10-16T23:25:00.786512+00:00",
                        "id": "aABbcCDdeEFf",
                        "startTime": "2023-10-16T23:24:01+00:00",
                        "state": "STOPPED"
                    },
                    {
                        "endTime": "2023-10-16T23:25:00.786512+00:00",
                        "id": "deEFfaABbcCD",
                        "startTime": "2023-10-16T23:24:01+00:00",
                        "state": "STOPPED"
                    }
                ],
                "endTime": "2023-10-16T23:25:00+00:00",
                "stageArn": "arn:aws:ivs:ap-northeast-1:123456789012:stage/efghabcdABCD",
                "startTime": "2023-10-16T23:24:00+00:00",
                "state": "STOPPED",
                "tags": {}
            }
        ]
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.