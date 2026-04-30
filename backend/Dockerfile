# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# Swapped libpq-dev for default-libmysqlclient-dev for TiDB/MySQL support
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    python3-dev \
    libffi-dev \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Upgrade build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Command to run migrations and start Gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:8000 config.wsgi:application"]