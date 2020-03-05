// @flow strict
import along from '@turf/along';
import area from '@turf/area';
import bboxPolygon from '@turf/bbox-polygon';
import distance from '@turf/distance';
import * as turf from '@turf/helpers';
import length from '@turf/length';
import axios, { AxiosResponse } from 'axios';
import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';
import proj4 from 'proj4';

import { GeometryObject } from './geojson';
import { getProjects, projectType, Project } from './project';
import { esriGeometryType, esriGeometry } from './common/geojson';

const URLS = [
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/3',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/4',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/7',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/10',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/12',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/15',
  'https://www.portlandmaps.com/arcgis/rest/services/Public/Transportation_System_Plan/MapServer/19'
];

// ESRI maps use this wkid
proj4.defs('102100', proj4.defs('EPSG:3857'));
proj4.defs('EPSG:102100', proj4.defs('EPSG:3857'));

export type Street = {
  id?: string;
  name?: string;
  block?: number;
  classifications?: Classification;
  projects?: Array<string>;
  geometry: turf.LineString;
};

export type Classification = {
  traffic?: string;
  transit?: string;
  bicycle?: string;
  pedestrian?: string;
  freight?: string;
  emergency?: string;
  design?: string;
  greenscape?: string;
};

export const classificationType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Classification',
  description: 'An object describing the combined classifications of a street in the City of Portland',
  fields: () => ({
    traffic: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    transit: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    bicycle: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    pedestrian: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    freight: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    emergency: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    design: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    },
    greenscape: {
      type: GraphQLString,
      description: 'The planning id of the street.'
    }
  })
});

/**
 * Streets combine segments that have a planning ID associated with them from the Transportation System Plan
 *
 */
export const streetType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Street',
  description: 'A segment in the City of Portland',
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The PBOT planning id of the street.'
    },
    name: {
      type: GraphQLString,
      description: 'The full name of the street.'
    },
    geometry: {
      type: GeometryObject,
      description: 'The GeoJSON LineString representing the street'
    },
    block: {
      type: GraphQLInt,
      description: 'The block number of the street.',
      resolve: async (street: Street): Promise<number | undefined> => {
        const url = 'https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData_Transportation/MapServer/68';

        const res = await axios
          .get(`${url}/query`, {
            params: {
              f: 'geojson',
              geometryType: esriGeometryType(street.geometry),
              geometry: esriGeometry(street.geometry),
              spatialRel: 'esriSpatialRelEnvelopeIntersects',
              inSR: '4326',
              outSR: '4326',
              outFields: '*'
            }
          })
          .catch(err => {
            throw new Error(err);
          });

        if (res.status == 200 && res.data && res.data.features) {
          // sort the features by distance
          // find midpoints
          // sort array by distance
          const streetMidpoint = along(
            street.geometry,
            length(turf.feature(street.geometry), { units: 'meters' }) / 2,
            { units: 'meters' }
          );

          for (const feature of res.data.features) {
            feature.properties.midpoint = along(feature.geometry, length(feature, { units: 'meters' }) / 2, {
              units: 'meters'
            });
            feature.properties.distance = distance(streetMidpoint, feature.properties.midpoint, { units: 'meters' });
          }

          res.data.features = res.data.features.sort(
            (a: turf.Feature<turf.LineString>, b: turf.Feature<turf.LineString>) => {
              const value =
                (a.properties ? a.properties.distance : Number.MAX_SAFE_INTEGER) -
                (b.properties ? b.properties.distance : Number.MIN_SAFE_INTEGER);
              return value;
            }
          );

          for (const feature of res.data.features) {
            if (street.name?.startsWith(feature.properties.FULL_NAME)) {
              return Math.min(
                feature.properties.LEFTADD1,
                feature.properties.LEFTADD2,
                feature.properties.RGTADD1,
                feature.properties.RGTADD2
              );
            }
          }
        }
      }
    },
    centroid: {
      type: GeometryObject,
      description: 'The midpoint of the street',
      resolve: (street: Street): turf.Point => {
        return along(street.geometry, length(turf.feature(street.geometry)) / 2).geometry;
      }
    },
    classifications: {
      type: classificationType,
      description: 'The list of classifications associated with this street'
    },
    projects: {
      type: GraphQLList(projectType),
      description: 'The projects that intersect with the bounding box of this street',
      resolve: (street: Street): Promise<Project[]> => getProjects(street)
    },
    relatedStreets: {
      type: GraphQLList(streetType),
      description: 'The street segments that adjoin this street segment',
      resolve: async (street: Street): Promise<Street[]> => {
        const url = 'https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData_Transportation/MapServer/68';

        const res: AxiosResponse<turf.FeatureCollection> = await axios
          .get(`${url}/query`, {
            params: {
              f: 'geojson',
              geometryType: esriGeometryType(street.geometry),
              geometry: esriGeometry(street.geometry),
              spatialRel: 'esriSpatialRelEnvelopeIntersects',
              inSR: '4326',
              outSR: '4326',
              outFields: '*'
            }
          })
          .catch(err => {
            throw new Error(err);
          });

        let streets = new Array<Street>();

        if (res.status == 200 && res.data && res.data.features) {
          streets = res.data.features.map(feature => {
            const street: Street = {
              id: '',
              name: feature.properties ? feature.properties.FULL_NAME : '',
              geometry: feature.geometry as turf.LineString,
              classifications: {}
            };
            return street;
          });
        }

        return streets;
      }
    }
  })
});

/**
 * Transform a GeoJSON street feature into an internal Street object
 * @param feature GeoJSON Feature from a portlandmaps ArcGIS REST API
 */
export function parseStreet(feature: turf.Feature<turf.LineString>): Street {
  if (!feature.properties) {
    return {
      geometry: feature.geometry
    };
  }

  return {
    id: feature.properties.TranPlanID,
    name: feature.properties.StreetName,
    geometry: feature.geometry,
    classifications: {
      traffic: feature.properties.Traffic,
      transit: feature.properties.Transit,
      bicycle: feature.properties.Bicycle,
      pedestrian: feature.properties.Pedestrian,
      freight: feature.properties.Freight,
      emergency: feature.properties.Emergency,
      design: feature.properties.Design,
      greenscape: feature.properties.Greenscape
    }
  };
}

/**
 * Helper function to get a street by ID.
 */
export async function getStreet(id: string): Promise<Street | null> {
  // Returning a promise just to illustrate GraphQL.js's support.
  for (const url of URLS) {
    const res = await axios
      .get(`${url}/query`, {
        params: {
          f: 'geojson',
          where: `TranPlanID='${id}'`,
          outSR: '4326',
          outFields: '*'
        }
      })
      .catch(err => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data = res.data.features[0];

      if (data) {
        return parseStreet(data);
      }
    }
  }

  return null;
}

/**
 * Helper function to get a streets within a bounding box.
 */
export async function getStreets(bbox: turf.BBox, spatialReference: number): Promise<Street[] | null> {
  if (spatialReference != 4326) {
    [bbox[0], bbox[1]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[0], bbox[1]]);
    [bbox[2], bbox[3]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[2], bbox[3]]);
  }

  for (const url of URLS) {
    const res = await axios
      .get(`${url}/query`, {
        params: {
          f: 'geojson',
          geometryType: 'esriGeometryEnvelope',
          geometry: bbox.join(','),
          spatialRel: 'esriSpatialRelIntersects',
          inSR: '4326',
          outSR: '4326',
          outFields: '*'
        }
      })
      .catch(err => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data: turf.Feature<turf.LineString>[] = res.data.features;

      return data.map((value: turf.Feature<turf.LineString>) => {
        return parseStreet(value);
      });
    }
  }

  return null;
}
