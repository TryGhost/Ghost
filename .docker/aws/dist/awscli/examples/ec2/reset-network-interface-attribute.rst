**To reset a network interface attribute**

The following ``reset-network-interface-attribute`` example resets the value of the source/destination checking attribute to ``true``. ::

    aws ec2 reset-network-interface-attribute \
        --network-interface-id eni-686ea200 \
        --source-dest-check

This command produces no output.
