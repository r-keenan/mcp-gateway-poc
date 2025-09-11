FROM python:3.11-slim

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set work directory
WORKDIR /app

# Copy project files
COPY pyproject.toml ./
COPY server.py ./

# Install dependencies
RUN uv sync --frozen

# Expose port for HTTP mode
EXPOSE 8000

# Default to HTTP mode
CMD ["uv", "run", "python", "server.py", "http", "8000"]