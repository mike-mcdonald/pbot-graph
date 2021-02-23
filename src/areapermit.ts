import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from 'graphql';
//GraphQLList, GraphQLSchema

//const BASE_URL = 'https://myapp.com/';

export type AreaPermit = {
  Code: string;
  HasPermit: boolean;
};

export const areaPermitType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermit',
  description: 'AreaPermitType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    Code: {
      type: GraphQLString,
      description: 'Licence plate being queried.'
    },
    HasPermit: {
      type: GraphQLBoolean,
      description: 'Has a valid permit.'
    }
  })
});

export async function lookupAreaPermit(id: string): Promise<AreaPermit | null> {
  if (id == null) {
    return null;
  } else {
    const lookupSuccess = Math.random() > 0.5 ? true : false;

    return {
      Code: id,
      HasPermit: lookupSuccess
    };
  }
}
