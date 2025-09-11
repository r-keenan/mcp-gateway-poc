# Basic MCP Server

A simple MCP (Model Context Protocol) server implementation in Python that supports both MCP and HTTP protocols.

## Installation

```bash
uv sync
```

## Usage

### MCP Protocol (stdio)
```bash
uv run python server.py
```

### HTTP Protocol
```bash
uv run python server.py http [port]
# Default port is 8000
uv run python server.py http 8080
```

## Available Resources

- `memory://example` - An example text resource

## Available Tools

- `echo` - Echo input text back
- `calculate` - Perform basic arithmetic calculations

## HTTP Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /resources` - List all resources
- `GET /resources/{resource_uri}` - Read specific resource
- `GET /tools` - List all tools
- `POST /tools/{tool_name}` - Call a specific tool

## Example HTTP Usage

```bash
# List tools
curl http://localhost:8000/tools

# Call echo tool
curl -X POST http://localhost:8000/tools/echo \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"text": "Hello World"}}'

# Call calculate tool
curl -X POST http://localhost:8000/tools/calculate \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"expression": "2 + 2"}}'
```