:title: AWS CLI Return Codes
:description: Describes the various return codes of the AWS CLI
:category: General
:related command: s3, s3 cp, s3 sync, s3 mv, s3 rm

These are the following return codes returned at the end of execution
of a CLI command:

* ``0`` -- Command was successful. There were no errors thrown by either
  the CLI or by the service the request was made to.

* ``1`` -- Limited to ``s3`` commands, at least one or more s3 transfers
  failed for the command executed.

* ``2`` -- The meaning of this return code depends on the command being run.

  The primary meaning is that the command entered on the command
  line failed to be parsed. Parsing failures can be caused by,
  but are not limited to, missing any required subcommands or arguments
  or using any unknown commands or arguments.
  Note that this return code meaning is applicable to all CLI commands.

  The other meaning is only applicable to ``s3`` commands.
  It can mean at least one or more files marked
  for transfer were skipped during the transfer process. However, all
  other files marked for transfer were successfully transferred.
  Files that are skipped during the transfer process include:
  files that do not exist, files that are character special devices,
  block special device, FIFOs, or sockets, and files that the user cannot
  read from.

* ``130`` -- The process received a SIGINT (Ctrl-C).

* ``252`` -- Command syntax was invalid, an unknown parameter was provided, or
  a parameter value was incorrect and prevented the command from running.

* ``253`` -- The system environment or configuration was invalid. While the
  command provided may be syntactically valid, missing configuration or
  credentials prevented the command from running.

* ``254`` -- The command was successfully parsed and a request was made to the
  specified service but the service returned an error. This will generally
  indicate incorrect API usage or other service specific issues.

* ``255`` -- General catch-all error. The command may have parsed correctly but
  an unspecified runtime error occurred when running the command. Because this
  is a general error code, an error may change from 255 to a more specific
  return code. A return code of 255 should not be relied on to determine a
  specific error case.


To determine the return code of a command, run the following right after
running a CLI command. Note that this will work only on POSIX systems::

  $ echo $?


Output (if successful)::

  0

On Windows PowerShell, the return code can be determined by running::

  > echo $lastexitcode

Output (if successful)::

  0


On Windows Command Prompt, the return code can be determined by running::

  > echo %errorlevel%

Output (if successful)::

  0
