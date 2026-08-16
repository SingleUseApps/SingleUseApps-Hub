module.exports = {
  apps: [
    {
      name: "license-service",
      script: "src/server.js",
      cwd: "/var/www/license-service",
      env: { NODE_ENV: "production" },
    },
  ],
};
