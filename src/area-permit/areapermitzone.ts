import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';

const ValidParkingZones = [
  {
    Value: 'APP Zone A',
    Text: 'Zone A'
  },
  {
    Value: 'APP Zone B',
    Text: 'Zone B'
  },
  {
    Value: 'APP Zone C',
    Text: 'Zone C'
  },
  {
    Value: 'APP Zone D',
    Text: 'Zone D'
  },
  {
    Value: 'APP Zone E',
    Text: 'Zone E'
  },
  {
    Value: 'APP Zone F',
    Text: 'Zone F'
  },
  {
    Value: 'APP Zone G',
    Text: 'Zone G'
  },
  {
    Value: 'APP Zone H',
    Text: 'Zone H'
  },
  {
    Value: 'APP Zone I',
    Text: 'Zone I'
  },
  {
    Value: 'APP Zone J',
    Text: 'Zone J'
  },
  {
    Value: 'APP Zone K',
    Text: 'Zone K'
  },
  {
    Value: 'APP Zone L',
    Text: 'Zone L'
  },
  {
    Value: 'APP Zone M',
    Text: 'Zone M'
  },
  {
    Value: 'APP Zone N',
    Text: 'Zone N'
  },
  {
    Value: 'APP Zone R',
    Text: 'Zone R'
  },
  {
    Value: 'APP Zone S',
    Text: 'Zone S'
  },
  {
    Value: 'APP Zone T',
    Text: 'Zone T'
  },
  {
    Value: 'APP Zone U',
    Text: 'Zone U'
  }
];

export type AreaPermitZone = {
  Value: string;
  Text: string;
};

export const areaPermitZoneType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermitZone',
  description: 'AreaPermitZoneType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    Value: {
      type: GraphQLString,
      description: 'Value of Area Permit Zone.'
    },
    Text: {
      type: GraphQLString,
      description: 'Readable Text for Area Permit Zone'
    }
  })
});

export async function getAreaPermitZones(): Promise<AreaPermitZone[]> {
  //console.log('you made it this far little buckaroo.');
  return ValidParkingZones;
}
