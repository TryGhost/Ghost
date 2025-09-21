**To get a digest for a ledger**

The following ``get-digest`` example requests a digest from the specified ledger at the latest committed block in the journal. ::

    aws qldb get-digest \
        --name vehicle-registration

Output::

    {
        "Digest": "6m6BMXobbJKpMhahwVthAEsN6awgnHK62Qq5McGP1Gk=",
        "DigestTipAddress": {
            "IonText": "{strandId:\"KmA3ZZca7vAIiJAK9S5Iwl\",sequenceNo:123}"
        }
    }

For more information, see `Data Verification in Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/verification.html>`__ in the *Amazon QLDB Developer Guide*.
