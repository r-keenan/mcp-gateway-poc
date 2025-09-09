FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm

# Install dependencies
RUN pnpm install 

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
