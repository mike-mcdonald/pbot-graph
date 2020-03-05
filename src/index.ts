import express from 'express';
import bodyParser from 'body-parser';
import graphqlHTTP from 'express-graphql';
import cors from 'cors';

import schema from './schema';

const app = express();

app.use(cors());

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: schema.getQueryType(),
    graphiql: process.env.NODE_ENV !== 'production'
  })
);

app.listen(4000, () => console.log('Now browse to localhost:4000/graphql'));
