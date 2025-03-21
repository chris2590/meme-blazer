const webpack = require('webpack');

module.exports = function override(config) {
  // Preserve any existing fallbacks, if they exist, or start with an empty object
  const fallback = config.resolve.fallback || {};
  
  // Assign all necessary module fallbacks
  Object.assign(fallback, {
    "vm": require.resolve("vm-browserify"),
    "http": require.resolve("stream-http"),
    "zlib": require.resolve("browserify-zlib"),
    "https": require.resolve("https-browserify"),
    "url": require.resolve("url/"),
    "stream": require.resolve("stream-browserify"),
    "crypto": require.resolve("crypto-browserify")
  });
  
  // Apply the updated fallbacks to the config
  config.resolve.fallback = fallback;
  
  // Add ProvidePlugin to make 'process' and 'Buffer' available globally
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);
  
  return config;
};
