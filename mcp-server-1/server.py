#!/usr/bin/env python3

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse
import sys
import os

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Resource, Tool, TextContent
import mcp.server.models as models
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPServer:
    def __init__(self):
        self.mcp_server = Server("basic-mcp-server")
        self.http_app = FastAPI(title="Basic MCP Server", version="1.0.0")
        self.setup_mcp_handlers()
        self.setup_http_routes()
    
    def setup_mcp_handlers(self):
        @self.mcp_server.list_resources()
        async def list_resources() -> List[Resource]:
            return [
                Resource(
                    uri="memory://example",
                    name="Example Resource",
                    mimeType="text/plain",
                    description="An example resource"
                )
            ]
        
        @self.mcp_server.read_resource()
        async def read_resource(uri: str) -> str:
            if uri == "memory://example":
                return "This is an example resource content"
            raise ValueError(f"Unknown resource: {uri}")
        
        @self.mcp_server.list_tools()
        async def list_tools() -> List[Tool]:
            return [
                Tool(
                    name="echo",
                    description="Echo the input text back",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text to echo"}
                        },
                        "required": ["text"]
                    }
                ),
                Tool(
                    name="calculate",
                    description="Perform basic arithmetic calculations",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string", "description": "Mathematical expression to evaluate"}
                        },
                        "required": ["expression"]
                    }
                )
            ]
        
        @self.mcp_server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            if name == "echo":
                text = arguments.get("text", "")
                return [TextContent(type="text", text=f"Echo: {text}")]
            elif name == "calculate":
                expression = arguments.get("expression", "")
                try:
                    result = eval(expression)
                    return [TextContent(type="text", text=f"Result: {result}")]
                except Exception as e:
                    return [TextContent(type="text", text=f"Error: {str(e)}")]
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    def setup_http_routes(self):
        @self.http_app.get("/")
        async def root():
            return {"message": "Basic MCP Server", "version": "1.0.0"}
        
        @self.http_app.get("/health")
        async def health():
            return {"status": "healthy", "timestamp": asyncio.get_event_loop().time()}
        
        @self.http_app.get("/resources")
        async def http_list_resources():
            resources = await self.mcp_server._request_handlers["resources/list"]()
            return {"resources": [r.model_dump() for r in resources]}
        
        @self.http_app.get("/resources/{resource_uri:path}")
        async def http_read_resource(resource_uri: str):
            try:
                content = await self.mcp_server._request_handlers["resources/read"](f"memory://{resource_uri}")
                return {"content": content}
            except Exception as e:
                raise HTTPException(status_code=404, detail=str(e))
        
        @self.http_app.get("/tools")
        async def http_list_tools():
            tools = await self.mcp_server._request_handlers["tools/list"]()
            return {"tools": [t.model_dump() for t in tools]}
        
        @self.http_app.post("/tools/{tool_name}")
        async def http_call_tool(tool_name: str, request: Request):
            try:
                body = await request.json()
                arguments = body.get("arguments", {})
                result = await self.mcp_server._request_handlers["tools/call"](tool_name, arguments)
                return {"result": [r.model_dump() for r in result]}
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

async def run_mcp_server():
    server = MCPServer()
    async with stdio_server() as (read_stream, write_stream):
        await server.mcp_server.run(
            read_stream, 
            write_stream, 
            server.mcp_server.create_initialization_options()
        )

def run_http_server(port: int = 8000):
    server = MCPServer()
    uvicorn.run(server.http_app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "http":
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
        print(f"Starting HTTP server on port {port}")
        run_http_server(port)
    else:
        print("Starting MCP server (stdio)")
        asyncio.run(run_mcp_server())