**To disconnect a stage participant**

The following ``disconnect-participant`` example disconnects the specified participant from the specified stage. ::

    aws ivs-realtime disconnect-participant \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --participant-id ABCDEfghij01234KLMN5678

This command produces no output.

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/userguide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.