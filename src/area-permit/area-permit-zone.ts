import { Geometry } from '@turf/helpers';
import { Feature } from '@turf/helpers';
import axios from 'axios';
import { GraphQLObjectType, GraphQLString } from 'graphql';
import { AreaPermitZone } from './types';

let REFRESHING = false;

export let areaPermitZones: Array<AreaPermitZone> | null = null;

export const areaPermitZoneType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermitZone',
  description: 'AreaPermitZoneType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type

  fields: () => ({
    id: {
      type: GraphQLString,
      description: 'value of Area Permit Zone.'
    },
    name: {
      type: GraphQLString,
      description: 'Readable text for Area Permit Zone'
    },
    displayName: {
      type: GraphQLString,
      description: 'String for use in things like labels or selections',
      resolve(zone: AreaPermitZone) {
        if (/(Zone )[A-Z]{1}/.test(zone.name)) {
          return zone.name;
        } else {
          return `Zone ${zone.id} (${zone.name})`;
        }
      }
    },
    visitorLimit: {
      type: GraphQLString,
      description: 'Readable text for Area Permit Zone'
    },
    enforcementHours: {
      type: GraphQLString,
      description: 'Readable text for Area Permit Zone'
    }
  })
});

async function refreshAreaPermitZones(): Promise<AreaPermitZone[] | null> {
  REFRESHING = true;

  try {
    const res = await axios
      .get(`https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData/MapServer/211/query`, {
        params: {
          f: 'geojson',
          geometryType: 'esriGeometryEnvelope',
          geometry: `{
        "spatialReference": { "wkid": 102100 },
        "xmin": -13674088.5469,
        "ymin": 5689892.284199998,
        "xmax": -13633591.503800001,
        "ymax": 5724489.626800001
      }`,
          spatialRel: 'esriSpatialRelIntersects',
          inSR: '4326',
          outSR: '4326',
          outFields: 'APPPZone, ZoneName, VisitorLimit, APPPTimeDay'
        }
      })
      .catch((err: any) => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data: Feature<Geometry>[] = res.data.features;

      areaPermitZones = data.reduce((prev, feature) => {
        if (feature.properties) {
          prev.push({
            id: feature.properties.APPPZone.toUpperCase(),
            name: feature.properties.ZoneName.replace(/[ ]{1}\(.*\)$/, ''), // Remove trailing parentheses
            visitorLimit: feature.properties.VisitorLimit.toLowerCase(),
            enforcementHours: feature.properties.APPPTimeDay.toLowerCase()
          });
        }
        return prev;
      }, new Array<AreaPermitZone>());
    }
  } finally {
    REFRESHING = false;
  }

  return areaPermitZones;
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
