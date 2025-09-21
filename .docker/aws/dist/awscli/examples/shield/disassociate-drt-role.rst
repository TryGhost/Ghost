**To remove the authorization for DRT to mitigate potential attacks on your behalf**

The following ``disassociate-drt-role`` example removes the association between the DRT and the account. After this call, the DRT can no longer access or manage your account. ::

    aws shield disassociate-drt-role 

This command produces no output.
 
For more information, see `Authorize the DDoS Response Team <https://docs.aws.amazon.com/waf/latest/developerguide/authorize-DRT.html>`__ in the *AWS Shield Advanced Developer Guide*.
