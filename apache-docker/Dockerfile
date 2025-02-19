# Use Ubuntu as the base image
FROM ubuntu

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package list and install Apache2
RUN apt-get update && \
    apt-get install -y apache2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set ServerName to localhost to avoid Apache2 warning
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Copy the custom index.html file
COPY index.html /var/www/html/index.html

# Set proper permissions
RUN chown www-data:www-data /var/www/html/index.html

# Expose port 80
EXPOSE 80

# Apache environment variables
ENV APACHE_RUN_DIR=/var/run/apache2
ENV APACHE_RUN_USER=www-data
ENV APACHE_RUN_GROUP=www-data
ENV APACHE_LOG_DIR=/var/log/apache2
ENV APACHE_PID_FILE=/var/run/apache2/apache2.pid

# Start Apache2 in foreground
CMD ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]
