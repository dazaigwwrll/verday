# All-in-one image for the Iranian (Liara) deployment:
# builds the web app, then runs the Node server which serves BOTH the
# API and the built site on one origin.

# --- build the web app ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
ENV SERVE_STATIC=true
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/server.js"]
