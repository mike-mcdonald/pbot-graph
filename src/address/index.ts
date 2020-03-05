import { point } from '@turf/helpers';
import bbox from '@turf/bbox';
import buffer from '@turf/buffer';
import proj4 from 'proj4';

import { GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList, GraphQLInt } from 'graphql';

import { locationType, Location } from '../location';
import { streetType, getStreets } from '../street';
import { IAddressSearchAPI } from './api/IAddressSearchAPI';
import { PortlandmapsSuggest } from './api/PortlandmapsSuggest';
import { ESRIGeocodeServer } from './api/EsriGeocodeServer';
import { Address, AddressCandidate } from './types';

/**
 * These are Flow types which correspond to the schema.
 * They represent the shape of the data visited during field resolution.
 */

export const addressType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Address',
  description: 'An address in the City of Portland',
  fields: () => ({
    name: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The full string street address.'
    },
    location: {
      type: GraphQLNonNull(locationType),
      description: 'Point that the address represents'
    },
    city: {
      type: GraphQLString,
      description: 'The full name of the address.'
    },
    zipCode: {
      type: GraphQLString,
      description: 'The five digit zip code.'
    },
    state: {
      type: GraphQLString,
      description: 'The full state name.'
    },
    zip4: {
      type: GraphQLString,
      description: 'The four digit zip code suffix.'
    },
    id: {
      type: GraphQLInt,
      description: 'The internal id of the address.'
    },
    type: {
      type: GraphQLString,
      description: 'The type of location that this address represents.'
    },
    county: {
      type: GraphQLString,
      description: 'The county this address resides in.'
    },
    streets: {
      type: GraphQLList(streetType),
      description: 'The streets within 100 meters of this address.',
      resolve: (address: Address) => {
        // take location, and generate bbox
        const [x, y] = proj4('EPSG:3857', 'EPSG:4326', [address.location.x, address.location.y]);
        const box = bbox(buffer(point([x, y]), 100, { units: 'meters' }));
        return getStreets(box, 4326);
      }
    }
  })
});

export async function getCandidates(search: string, city?: string): Promise<Address[]> {
  let api: IAddressSearchAPI = new PortlandmapsSuggest();
  let candidates: AddressCandidate[] = [];

  const options: {
    city?: string;
  } = {};

  city ? (options.city = city) : undefined;

  try {
    candidates = await api.search(search, options);
    if (candidates)
      return candidates.map(c => {
        const a: Address = {
          location: c.location,
          name: c.address,
          city: c.attributes.city,
          state: c.attributes.state,
          zipCode: c.attributes.zip_code,
          type: c.attributes.type,
          county: c.attributes.county
        };
        return a;
      });
  } catch {
    api = new ESRIGeocodeServer();
    candidates = await api.search(search).catch(err => {
      throw new Error('Error retrieving the address');
    });
    if (candidates)
      return candidates.map(c => {
        const [name, city, state, zipCode] = c.address.split(',');
        const a: Address = {
          location: c.location,
          name,
          city,
          state,
          zipCode: parseInt(zipCode),
          type: 'address'
        };
        return a;
      });
  }

  return [];
}
