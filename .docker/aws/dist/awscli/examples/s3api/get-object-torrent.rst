The following command creates a torrent for an object in a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-object-torrent --bucket amzn-s3-demo-bucket --key large-video-file.mp4 large-video-file.torrent

The torrent file is saved locally in the current folder. Note that the output filename (``large-video-file.torrent``) is specified without an option name and must be the last argument in the command.