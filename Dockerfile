FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql

RUN a2enmod rewrite

# Web root: PennyPal static files
COPY public/ /var/www/html/

# Not served by Apache; PHP can include it (see APP_CONFIG_DIR)
COPY config/ /app/config/

ENV APP_CONFIG_DIR=/app/config

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
