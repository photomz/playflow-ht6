const dotenv = require("dotenv");

module.exports = async ({ options, resolveConfigurationProperty }) => {
  // Load env vars into Serverless environment
  // You can do more complicated env var resolution with dotenv here
  const envFile = dotenv.config({ path: ".env" }).parsed;
  return Object.assign(
    {},
    envFile, // `dotenv` environment variables
    process.env // system environment variables
  );
};

// TODO: Change callback url with .tech domain name
