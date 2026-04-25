#!/bin/sh
set -e
# Railway (and other hosts) set PORT; Apache must listen on it.
if [ -n "$PORT" ]; then
  if [ -f /etc/apache2/ports.conf ]; then
    sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
  fi
  if [ -f /etc/apache2/sites-available/000-default.conf ]; then
    sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf
  fi
fi
exec apache2-foreground
