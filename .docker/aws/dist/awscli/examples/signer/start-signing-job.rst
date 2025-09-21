**To start a signing job**

The following ``start-signing-job`` example starts a signing job on the code found at the specified source. It uses the specified profile to do the signing and places the signed code in the specified destination. ::

    aws signer start-signing-job \
        --source 's3={bucketName=signer-source,key=MyCode.rb,version=PNyFaUTgsQh5ZdMCcoCe6pT1gOpgB_M4}' \
        --destination 's3={bucketName=signer-destination,prefix=signed-}' \
        --profile-name MyProfile7

The output is the ID of the signing job. ::

    {
        "jobId": "2065c468-73e2-4385-a6c9-0123456789abc"
    }
