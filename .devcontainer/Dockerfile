FROM node:lts

# Make sure we can get to the app from the normal port
EXPOSE 2368

# Make the default folder for the application
RUN mkdir /ghost

# Set the working directory for any subsequent commands to the app directory
WORKDIR /ghost

# Expose a voume for the app directory
VOLUME /ghost

# Copy over an initial setup script
COPY setup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/setup.sh

# Copy over a new default config so we can expose the app on 0.0.0.0
COPY config.development.json /usr/local/

# Run the script to configure git and install project and keep the container alive by running bash
CMD /usr/local/bin/setup.sh && /bin/bash