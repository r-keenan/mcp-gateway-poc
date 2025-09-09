const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Example service routes - configure these based on your microservices
const services = {
  "/api/users": "http://localhost:3001",
  "/api/orders": "http://localhost:3002",
  "/api/products": "http://localhost:3003",
};

// Create proxy middleware for each service
Object.keys(services).forEach((path) => {
  const target = services[path];
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${path}`]: "",
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for ${path}:`, err.message);
        res.status(503).json({
          error: "Service Unavailable",
          message: `Unable to reach ${path} service`,
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.originalUrl} to ${target}`);
      },
    }),
  );
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "API Gateway is running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      services: Object.keys(services),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong",
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Configured services:`, services);
});

module.exports = app;

