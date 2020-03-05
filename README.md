# PBOT GraphQL Server
This repository is a GraphQL server to power PBOT web applications
## Static text in this repository
In the `src/document` folder there are folders for any static content that can be displayed in web applications.  All the text is written in [GitHub markdown](https://github.github.com/gfm/) which is then translated into HTML and served by this server through the graph's `document(name:string)` query.
