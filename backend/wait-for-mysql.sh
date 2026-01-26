#!/bin/sh
set -e

echo "⏳ Esperando a que MySQL esté disponible en $DB_HOST:$DB_PORT..."
until nc -z -v $DB_HOST $DB_PORT; do
  sleep 2
done

echo "✅ MySQL está disponible, arrancando backend..."
exec "$@"