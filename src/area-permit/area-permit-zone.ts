import { Geometry } from '@turf/helpers';
import { Feature } from '@turf/helpers';
import axios, { AxiosError } from 'axios';
import * as fastxml from 'fast-xml-parser';
import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { AreaPermitZone, ZoneEnforcementInfo } from './types';

let REFRESHING = false;

export const areaPermitZones: Array<AreaPermitZone> | null = null;

export const areaPermitZoneType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermitZone',
  description: 'AreaPermitZoneType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type

  fields: () => ({
    id: {
      type: GraphQLString
    },
    name: {
      type: GraphQLString
    } /*,
    displayName: {
      type: GraphQLString,
      description: 'String for use in things like labels or selections',
      resolve(zone: AreaPermitZone) {
        return zone.name;
      }
    }*/
  })
});

async function refreshAreaPermitZones(): Promise<AreaPermitZone[] | null> {
  REFRESHING = true;

  try {
    if (!process.env.AREA_PERMIT_CALE_USERNAME || !process.env.AREA_PERMIT_CALE_PASSWORD) {
      throw Error('No API credentials found, unable to call Cale API');
    }

    // get Zones from Cale //
    const res = await axios.get(
      `https://webservice.mdc.dmz.caleaccess.com/cwo2exportservice/Enforcement/1/EnforcementService.svc/getenforcementzones`,
      {
        auth: { username: process.env.AREA_PERMIT_CALE_USERNAME, password: process.env.AREA_PERMIT_CALE_PASSWORD },
        headers: {
          'content-type': 'application/json'
        }
      }
    );

    if (res.status == 200 && res.data) {
      const tempParsedZones: { Description: string; Name: string }[] = fastxml.parse(res.data).ArrayOfEnforcementZone
        .EnforcementZone;

      const areaPermitZones: AreaPermitZone[] = tempParsedZones
        .filter(a => a.Name.startsWith('APP Zone'))
        .map(item => {
          return <AreaPermitZone>{
            id: item.Name,
            name: item.Name + (item.Description != '' ? ' (' + item.Description + ')' : '')
          };
        });

      return areaPermitZones;
    }
  } catch (err) {
    throw err;
  } finally {
    REFRESHING = false;
  }

  return null;
}

export async function getAreaPermitZones(refreshFromSource = true): Promise<Array<AreaPermitZone> | null> {
  if (areaPermitZones == null) {
    // Haven't retrieved the zones yet...
    // look them up
    return await refreshAreaPermitZones();
  } else {
    // We have already retrieved the zones at least once...
    // if its refreshing, return in-memory zones //
    if (REFRESHING) {
      return areaPermitZones;
    } else {
      // Allow a toggle to prevent refreshing
      // Used when resolving a zone from another object
      if (refreshFromSource) {
        refreshAreaPermitZones();
      }
      return areaPermitZones;
    }
    // else return areaPermitZones then refresh in background //
  }
}
