import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const server = new Server(
  {
    name: "mcp-express-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const tools = [
  {
    name: "hello",
    description: "Say hello to someone",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name to greet",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_numbers",
    description: "Add two numbers together",
    inputSchema: {
      type: "object",
      properties: {
        a: {
          type: "number",
          description: "First number",
        },
        b: {
          type: "number",
          description: "Second number",
        },
      },
      required: ["a", "b"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "hello":
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${args.name}!`,
          },
        ],
      };

    case "add_numbers":
      const result = args.a + args.b;
      return {
        content: [
          {
            type: "text",
            text: `${args.a} + ${args.b} = ${result}`,
          },
        ],
      };

    default:
      throw new Error(`Tool ${name} not found`);
  }
});

app.get("/", (req, res) => {
  res.json({
    name: "MCP Express Server",
    version: "1.0.0",
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  });
});

app.post("/mcp/tools/list", async (req, res) => {
  try {
    const response = await server.request(
      { method: "tools/list" },
      ListToolsRequestSchema,
    );
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/mcp/tools/call", async (req, res) => {
  try {
    const response = await server.request(req.body, CallToolRequestSchema);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.MCP_STDIO) {
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log("MCP server running via stdio");
} else {
  app.listen(PORT, () => {
    console.log(`MCP Express server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} for server info`);
  });
}

