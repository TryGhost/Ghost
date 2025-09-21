**Example 1: To get a document revision and proof for verification using input files**

The following ``get-revision`` example requests a revision data object and a proof from the specified ledger. The request is for a specified digest tip address, document ID, and block address of the revision. ::

    aws qldb get-revision \
        --name vehicle-registration \
        --block-address file://myblockaddress.json \
        --document-id JUJgkIcNbhS2goq8RqLuZ4 \
        --digest-tip-address file://mydigesttipaddress.json

Contents of ``myblockaddress.json``::

    {
        "IonText": "{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:100}"
    }

Contents of ``mydigesttipaddress.json``::

    {
        "IonText": "{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:123}"
    }

Output::

    {
        "Revision": {
            "IonText": "{blockAddress:{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:100},hash:{{mHVex/yjHAWjFPpwhBuH2GKXmKJjK2FBa9faqoUVNtg=}},data:{VIN:\"1N4AL11D75C109151\",LicensePlateNumber:\"LEWISR261LL\",State:\"WA\",PendingPenaltyTicketAmount:90.25,ValidFromDate:2017-08-21,ValidToDate:2020-05-11,Owners:{PrimaryOwner:{PersonId:\"BFJKdXhnLRT27sXBnojNGW\"},SecondaryOwners:[{PersonId:\"CMVdR77XP8zAglmmFDGTvt\"}]},City:\"Everett\"},metadata:{id:\"JUJgkIcNbhS2goq8RqLuZ4\",version:3,txTime:2019-09-16T19:37:05.344Z,txId:\"FnQeJBAicTX0Ah32ZnVtSX\"}}"
        },
        "Proof": {
            "IonText": "[{{eRSwnmAM7WWANWDd5iGOyK+T4tDXyzUq6HZ/0fgLHos=}},{{VV1rdaNuf+yJZVGlmsM6gr2T52QvBO8Lg+KgpjcnWAU=}},{{7kewBXhpdbClcZKxhVmpoMHpUGOJtWQD0iY2LPfZkYA=}},{{l3+EXs69K1+rehlqyWLkt+oHDlw4Zi9pCLW/t/mgTPM=}},{{48CXG3ehPqsxCYd34EEa8Fso0ORpWWAO8010RJKf3Do=}},{{9UnwnKSQT0i3ge1JMVa+tMIqCEDaOPTkWxmyHSn8UPQ=}},{{3nW6Vryghk+7pd6wFCtLufgPM6qXHyTNeCb1sCwcDaI=}},{{Irb5fNhBrNEQ1VPhzlnGT/ZQPadSmgfdtMYcwkNOxoI=}},{{+3CWpYG/ytf/vq9GidpzSx6JJiLXt1hMQWNnqOy3jfY=}},{{NPx6cRhwsiy5m9UEWS5JTJrZoUdO2jBOAAOmyZAT+qE=}}]"
        }
    }

For more information, see `Data Verification in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/verification.html>`__ in the *Amazon QLDB Developer Guide*.

**Example 2: To get a document revision and proof for verification using shorthand syntax**

The following ``get-revision`` example requests a revision data object and a proof from the specified ledger using shorthand syntax. The request is for a specified digest tip address, document ID, and block address of the revision. ::

    aws qldb get-revision \
        --name vehicle-registration \
        --block-address 'IonText="{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:100}"' \
        --document-id JUJgkIcNbhS2goq8RqLuZ4 \
        --digest-tip-address 'IonText="{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:123}"'

Output::

    {
        "Revision": {
            "IonText": "{blockAddress:{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:100},hash:{{mHVex/yjHAWjFPpwhBuH2GKXmKJjK2FBa9faqoUVNtg=}},data:{VIN:\"1N4AL11D75C109151\",LicensePlateNumber:\"LEWISR261LL\",State:\"WA\",PendingPenaltyTicketAmount:90.25,ValidFromDate:2017-08-21,ValidToDate:2020-05-11,Owners:{PrimaryOwner:{PersonId:\"BFJKdXhnLRT27sXBnojNGW\"},SecondaryOwners:[{PersonId:\"CMVdR77XP8zAglmmFDGTvt\"}]},City:\"Everett\"},metadata:{id:\"JUJgkIcNbhS2goq8RqLuZ4\",version:3,txTime:2019-09-16T19:37:05.344Z,txId:\"FnQeJBAicTX0Ah32ZnVtSX\"}}"
        },
        "Proof": {
            "IonText": "[{{eRSwnmAM7WWANWDd5iGOyK+T4tDXyzUq6HZ/0fgLHos=}},{{VV1rdaNuf+yJZVGlmsM6gr2T52QvBO8Lg+KgpjcnWAU=}},{{7kewBXhpdbClcZKxhVmpoMHpUGOJtWQD0iY2LPfZkYA=}},{{l3+EXs69K1+rehlqyWLkt+oHDlw4Zi9pCLW/t/mgTPM=}},{{48CXG3ehPqsxCYd34EEa8Fso0ORpWWAO8010RJKf3Do=}},{{9UnwnKSQT0i3ge1JMVa+tMIqCEDaOPTkWxmyHSn8UPQ=}},{{3nW6Vryghk+7pd6wFCtLufgPM6qXHyTNeCb1sCwcDaI=}},{{Irb5fNhBrNEQ1VPhzlnGT/ZQPadSmgfdtMYcwkNOxoI=}},{{+3CWpYG/ytf/vq9GidpzSx6JJiLXt1hMQWNnqOy3jfY=}},{{NPx6cRhwsiy5m9UEWS5JTJrZoUdO2jBOAAOmyZAT+qE=}}]"
        }
    }

For more information, see `Data Verification in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/verification.html>`__ in the *Amazon QLDB Developer Guide*.
