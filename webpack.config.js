const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  target: 'node',
  mode: process.env.NODE_ENV,
  externals: [nodeExternals()],
  entry: './lib/index.ts',
  output: {
    libraryTarget: 'umd',
    library: '@jesusx21/express-open-api',
    umdNamedDefine: true,
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/lib'),
  },
  resolve: {
    modules: ['node_modules','lib'],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts)?$/,
        exclude: /(node_modules)/,
        use: [{
          loader: 'ts-loader',
        }],
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
  watchOptions: {
    ignored: /node_modules/
  }
};
