import { GraphQLObjectType, GraphQLString } from 'graphql';
import { AreaPermitZone } from './types';

export const APREA_PARKING_PERMIT_ZONES: Array<AreaPermitZone> = [
  {
    value: 'APP Zone A',
    text: 'Zone A'
  },
  {
    value: 'APP Zone B',
    text: 'Zone B'
  },
  {
    value: 'APP Zone C',
    text: 'Zone C'
  },
  {
    value: 'APP Zone D',
    text: 'Zone D'
  },
  {
    value: 'APP Zone E',
    text: 'Zone E'
  },
  {
    value: 'APP Zone F',
    text: 'Zone F'
  },
  {
    value: 'APP Zone G',
    text: 'Zone G'
  },
  {
    value: 'APP Zone H',
    text: 'Zone H'
  },
  {
    value: 'APP Zone I',
    text: 'Zone I'
  },
  {
    value: 'APP Zone J',
    text: 'Zone J'
  },
  {
    value: 'APP Zone K',
    text: 'Zone K'
  },
  {
    value: 'APP Zone L',
    text: 'Zone L'
  },
  {
    value: 'APP Zone M',
    text: 'Zone M'
  },
  {
    value: 'APP Zone N',
    text: 'Zone N'
  },
  {
    value: 'APP Zone R',
    text: 'Zone R'
  },
  {
    value: 'APP Zone S',
    text: 'Zone S'
  },
  {
    value: 'APP Zone T',
    text: 'Zone T'
  },
  {
    value: 'APP Zone U',
    text: 'Zone U'
  }
];

export const areaPermitZoneType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermitZone',
  description: 'AreaPermitZoneType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    value: {
      type: GraphQLString,
      description: 'value of Area Permit Zone.'
    },
    text: {
      type: GraphQLString,
      description: 'Readable text for Area Permit Zone'
    }
  })
});

export async function getAreaPermitZones(): Promise<AreaPermitZone[]> {
  //console.log('you made it this far little buckaroo.');
  return APREA_PARKING_PERMIT_ZONES;
}
