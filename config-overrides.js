const { override, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  // Desativa os source maps para módulos de node_modules
  (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { 
        module: /node_modules/,
        message: /Failed to parse source map/,
      },
    ];
    
    // Configuração para resolver problemas de WebSocket
    if (process.env.NODE_ENV === 'development') {
      config.devServer = {
        ...config.devServer,
        client: {
          webSocketURL: {
            hostname: 'localhost',
            pathname: '/ws',
            port: 5174,
            protocol: 'ws',
          },
          overlay: {
            errors: true,
            warnings: false,
          },
        },
        hot: true,
        webSocketServer: 'ws',
      };
    }
    
    return config;
  },
  // Adiciona variáveis de ambiente para o Webpack
  addWebpackPlugin(
    new webpack.DefinePlugin({
      'process.env.WDS_SOCKET_PORT': JSON.stringify(process.env.WDS_SOCKET_PORT || '5174'),
    })
  )
);
