import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList } from 'graphql';

import fse from 'fs-extra';
import Metalsmith, { Files } from 'metalsmith';
import markdown from 'metalsmith-markdown';
import git, { Reset } from 'nodegit';
import path from 'path';

const database = JSON.parse(fse.readFileSync(path.resolve(__dirname, './documents.json'), 'utf8'));

for (const document of Object.keys(database)) {
  const dir = path.resolve(__dirname, document);

  fse.exists(dir, exists => {
    const checkoutRemoteBranch = function(repo: git.Repository): Promise<void> {
      return repo
        .getBranch(database[document].branch)
        .then(reference => {
          return repo.checkoutBranch(reference, {});
        })
        .then(() => {
          return repo.getReferenceCommit(`refs/remotes/origin/${database[document].branch}`);
        })
        .then(commit => {
          git.Reset.reset(repo, commit, Reset.TYPE.HARD, {});
        });
    };

    if (!exists) {
      git.Clone.clone(database[document].repository, dir, {
        fetchOpts: {
          callbacks: {
            certificateCheck: (): number => {
              // github will fail cert check on some OSX machines
              // this overrides that check
              return 0;
            }
          }
        }
      }).then(repo => {
        return checkoutRemoteBranch(repo);
      });
    } else {
      git.Repository.open(dir).then(repo => {
        return checkoutRemoteBranch(repo);
      });
    }
  });
}

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
  description: 'A section of text in a Portland Bureau of Transportaiton document.',
  fields: {
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
  }
});

let refreshing = false;

export const getDocument = (documentName: string): Promise<Section[]> =>
  new Promise<Section[]>((resolve, reject) => {
    if (Object.keys(database).findIndex(value => value === documentName) == -1) {
      reject(new Error(`No document named ${documentName} in list of documents.`));
    }

    Metalsmith(__dirname)
      .source(path.resolve(__dirname, documentName, database[documentName].subDir))
      .ignore('.git')
      .destination(`./build/${documentName}`)
      .clean(true)
      .use(markdown())
      .build((err: Error | null, files: Files) => {
        if (err) {
          reject(err);
          return;
        }

        const sections = new Array<Section>();

        Object.keys(files).forEach(key => {
          const text = files[key];

          try {
            const tree: number[] = text.tree;

            // ignore files that aren't attached to a tree
            if (tree) {
              const section: Section = {
                id: text.id,
                name: text.name,
                number: tree.pop(),
                tree: [...tree],
                depth: tree.length,
                content: text.contents.toString()
              };

              sections.push(section);
            }
          } catch (error) {
            console.error(`Error parsing ${key}: ${JSON.stringify(error)}`);
          }
        });

        resolve(sections);
      });

    if (!refreshing) {
      refreshing = true;
      let repository: git.Repository;
      git.Repository.open(path.resolve(__dirname, documentName))
        .then(
          (repo): Promise<void> => {
            repository = repo;
            return repository.fetchAll({
              callbacks: {
                certificateCheck: (): number => {
                  return 0;
                }
              }
            });
          }
        )
        .then(
          (): Promise<git.Oid> => {
            refreshing = false;
            const branch = database[documentName].branch;
            return repository.mergeBranches(branch, `origin/${branch}`);
          }
        );
    }
  });
