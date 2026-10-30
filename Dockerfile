FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY backend backend
COPY frontend frontend
COPY scripts scripts
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/app/uploads
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/out frontend/out
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
CMD ["node","backend/dist/index.js"]
