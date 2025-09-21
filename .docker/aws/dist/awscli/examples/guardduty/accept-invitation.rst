**To accept an invitation to become a GuardDuty member account in the current region**

The following ``accept-invitation`` example shows how to accept an invitation to become a GuardDuty member account in the current region. ::

    aws guardduty accept-invitation  \
        --detector-id 12abc34d567e8fa901bc2d34eexample \ 
        --master-id 123456789111 \
        --invitation-id d6b94fb03a66ff665f7db8764example

This command produces no output.

For more information, see `Managing GuardDuty accounts by invitation <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_invitations.html>`__ in the GuardDuty User Guide.
