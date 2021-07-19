import assert from 'assert';

import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from 'graphql';
import axios from 'axios';

import * as fastxml from 'fast-xml-parser';
import { AreaPermit, AreaPermitZone } from './types';
import { areaPermitZoneType, getAreaPermitZones } from './area-permit-zone';

const CALE_ENFORCEMENT_API_URL =
  'https://webservice.mdc.dmz.caleaccess.com/cwo2exportservice/Enforcement/5/EnforcementService.svc';

/* eslint-disable @typescript-eslint/naming-convention */
type CaleParkingData = {
  Code: string;
  StartDateUtc: string;
  EndDateUtc: string;
  Zone: string;
};
/* eslint-enable @typescript-eslint/naming-convention */

export const areaPermitType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermit',
  description: 'AreaPermitType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    licensePlate: {
      type: GraphQLString,
      description: 'Licence plate that owns the area parking permit.'
    },
    zone: {
      type: areaPermitZoneType,
      description: 'Area parking permit zone for this permit.'
    },
    isValid: {
      type: GraphQLBoolean,
      description: 'Whether the area parking permit is valid (i.e., active, and not expired).'
    }
  })
});

async function callCaleAPI(id: string): Promise<string> {
  if (!process.env.AREA_PERMIT_CALE_USERNAME || !process.env.AREA_PERMIT_CALE_PASSWORD) {
    throw Error('No API credentials found, unable to call Cale API');
  }

  const result = await axios.get(`${CALE_ENFORCEMENT_API_URL}/get/${id}/5`, {
    auth: { username: process.env.AREA_PERMIT_CALE_USERNAME, password: process.env.AREA_PERMIT_CALE_PASSWORD },
    headers: {
      'content-type': 'application/json'
    }
  });

  return result.data;
}

async function reduceCaleParkingData(data: CaleParkingData): Promise<AreaPermit> {
  const startDate: Date = new Date(data.StartDateUtc);
  const endDate: Date = new Date(data.EndDateUtc);

  const currentDate = new Date();

  //console.log('is valid: ' + (startDate <= currentDate && endDate >= currentDate));
  //console.log('  startdate: ' + startDate);
  //console.log('  currentdate: ' + currentDate);
  //console.log('  enddate: ' + endDate);

  return {
    licensePlate: data.Code,
    // verify how app zones are named by cale //
    //zone: await findZone(data.Zone, z => data.Zone == `APP Zone ${z.id}`),
    zone: await findZone(data.Zone, z => data.Zone == z.id),
    isValid: startDate <= currentDate && endDate >= currentDate
  };
}

async function findZone(
  id: string,
  predicate?: (value: AreaPermitZone, index: number, obj: AreaPermitZone[]) => unknown
) {
  if (!predicate) {
    predicate = z => z.id == id;
  }
  const zones = await getAreaPermitZones(false);
  return zones && zones.find(predicate);
}

export async function lookupAreaPermit(licensePlate: string, areaPermitZone: string): Promise<AreaPermit | null> {
  assert.ok(licensePlate, 'Must pass a license plate to search Cale API');
  assert.ok(areaPermitZone, 'Must pass an area parking permit zone to query');

  const xmlResponse = await callCaleAPI(licensePlate);

  try {
    const xmlResponseObj = fastxml.parse(xmlResponse);

    let returnData: AreaPermit = {
      licensePlate,
      //zone: areaPermitZone,
      //zone: AREA_PARKING_PERMIT_ZONES.find(z => z.value == areaPermitZone),
      zone: await findZone(areaPermitZone),
      isValid: false
    };

    // If no records are returned, there is no valid parking data for that license plate
    if (!xmlResponseObj.ArrayOfValidParkingData.ValidParkingData) {
      return returnData;
    }

    // We could get multiple parking data results or only one
    //  so we'll cast any return values as an array to reduce code duplication
    const parkingData = Array.isArray(xmlResponseObj.ArrayOfValidParkingData.ValidParkingData)
      ? xmlResponseObj.ArrayOfValidParkingData.ValidParkingData
      : [xmlResponseObj.ArrayOfValidParkingData.ValidParkingData];

    returnData = parkingData.reduce(async (acc: AreaPermit, curr: CaleParkingData) => {
      const permit = await reduceCaleParkingData(curr);
      if (permit.zone && permit.zone.id == areaPermitZone && permit.isValid) {
        acc = permit;
      }
      return acc;
    }, returnData);

    return returnData;
  } catch {
    throw Error('Failed to parse Cale query result.');
  }
}
