import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList } from 'graphql';

import Metalsmith, { Files } from 'metalsmith';
import markdown from 'metalsmith-markdown';

export type Language = {
  code: string;
};

export type Section = {
  id?: string;
  number?: number;
  tree: number[];
  depth: number;
  name?: string;
  content?: string;
};

export const sectionType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Section',
  description: 'A transportation project in the City of Portland',
  fields: () => ({
    id: {
      type: GraphQLString,
      description: 'The id of the section, for routing.'
    },
    number: {
      type: GraphQLInt,
      description: 'The section number within the parent section, for sorting purposes.'
    },
    depth: {
      type: GraphQLInt,
      description: 'The section number within the parent section, for sorting purposes.'
    },
    tree: {
      type: GraphQLList(GraphQLInt),
      description: 'The tree of parent section numbers.'
    },
    name: {
      type: GraphQLString,
      description: 'The display name of the section.'
    },
    content: {
      type: GraphQLString,
      description: 'The stringified HTML content of the section.'
    }
  })
});

export const getText = (documentName: string): Promise<Section[]> =>
  new Promise<Section[]>((resolve, reject) => {
    Metalsmith(__dirname)
      .source(`./${documentName}`)
      .destination(`./${documentName}/built`)
      .clean(false) // do not clean destination
      // directory before new build
      .use(markdown())
      .build(function (err: Error | null, files: Files) {
        if (err) reject(err);

        const sections: Section[] = new Array<Section>();

        Object.keys(files).forEach(key => {
          const text = files[key];

          const tree: number[] = text.tree;

          try {
            const section: Section = {
              id: text.id,
              name: text.name,
              number: tree.pop(),
              tree: [...tree],
              depth: tree.length,
              content: text.contents.toString()
            };

            sections.push(section);
          } catch (error) {
            console.error(`Error parsing ${JSON.stringify(text)}`);
          }
        });

        resolve(sections);
      });
  });
