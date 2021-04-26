import { Geometry } from '@turf/helpers';
import { Feature } from '@turf/helpers';
import axios from 'axios';
import { GraphQLObjectType, GraphQLString } from 'graphql';
import { AreaPermitZone } from './types';

let REFRESHING = false;

export let areaPermitZones: AreaPermitZone[] | null = null;

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
    const zones = new Array<AreaPermitZone>();

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

      zones.push(
        ...data.reduce((prev, feature) => {
          if (feature.properties) {
            prev.push({
              id: feature.properties.APPPZone.toUpperCase(),
              name: feature.properties.ZoneName,
              visitorLimit: feature.properties.VisitorLimit,
              enforcementHours: feature.properties.APPPTimeDay
            });
          }
          return prev;
        }, new Array<AreaPermitZone>())
      );
      areaPermitZones = zones;
    }
  } finally {
    REFRESHING = false;
  }

  return areaPermitZones;
}

export async function getAreaPermitZones(refreshFromSource = true): Promise<AreaPermitZone[] | null> {
  //console.log('you made it this far little buckaroo.');
  //return AREA_PARKING_PERMIT_ZONES;

  if (areaPermitZones == null) {
    // look them up
    return await refreshAreaPermitZones();
  } else {
    // if its refreshing, return areaPermitZones //
    if (REFRESHING) {
      return areaPermitZones;
    } else {
      if (refreshFromSource) {
        refreshAreaPermitZones();
      }
      return areaPermitZones;
    }
    // else return areaPermitZones then refresh in background //
  }
}
