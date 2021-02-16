# PBOT GraphQL Server
[![mike-mcdonald](https://circleci.com/gh/mike-mcdonald/pbot-graph.svg?style=svg)](https://circleci.com/gh/mike-mcdonald/pbot-graph)

This repository is a GraphQL server to power PBOT web applications
## Development
### Install dependencies
```
npm install
```
### Start a development server
```
npm start
```
This will create a `nodemon` process to watch the source code and re-build on changes. Once the build has been completed after each change, you can reach the interactive GraphQL server at http://localhost:4000/graphql
### Create a production-ready build
```
npm run build
```
### Debugging the server
This project contains a VS Code debugging profile in `.vscode/launch.json`. You may use this to start a debugging session and step through server responses. The profile will run a production build then start the server. To capture new changes, restart the debugger.