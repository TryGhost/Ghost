**Example 1: To download the latest part of a DB log file**

The following ``download-db-log-file-portion`` example downloads only the latest part of your log file, saving it to a local file named ``tail.txt``. ::

    aws rds download-db-log-file-portion \
        --db-instance-identifier test-instance \
        --log-file-name log.txt \
        --output text > tail.txt

The saved file might contain blank lines.  They appear at the end of each part of the log file while being downloaded.

**Example 2: To download an entire DB log file**

The following ``download-db-log-file-portion`` example downloads the entire log file, using the ``--starting-token 0`` parameter, and saves the output to a local file named ``full.txt``. ::

    aws rds download-db-log-file-portion \
        --db-instance-identifier test-instance \
        --log-file-name log.txt \
        --starting-token 0 \
        --output text > full.txt

The saved file might contain blank lines.  They appear at the end of each part of the log file while being downloaded.