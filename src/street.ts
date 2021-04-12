// @flow strict
import along from '@turf/along';
import bboxf from '@turf/bbox';
import distance from '@turf/distance';
import * as turf from '@turf/helpers';
import length from '@turf/length';
import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';
import proj4 from 'proj4';
import ArcGISParser, { Feature } from 'terraformer-arcgis-parser';

import axios from './api/arcgis';
import { esriGeometry, esriGeometryType } from './common/geojson';
import { GeometryObject } from './geojson';
import { AreaPlan, areaPlanType, getAreaPlansByBBox } from './plan/area-plan';
import { getMasterStreetPlansByBBox, masterStreetPlanType } from './plan/master-street-plan';
import { MasterStreetPlan } from './plan/types';
import { getProjects, Project, projectType } from './project';

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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

        try {
          const res = await axios.get(`${url}/query`, {
            params: {
              f: 'geojson',
              geometryType: esriGeometryType(street.geometry),
              geometry: esriGeometry(street.geometry),
              spatialRel: 'esriSpatialRelEnvelopeIntersects',
              inSR: 4326,
              outSR: 4326,
              outFields: '*'
            }
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
        } catch (err) {
          console.debug(JSON.stringify(err));
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
    areaPlans: {
      type: GraphQLList(areaPlanType),
      description: 'The area plans that intersect with the bounding box of this street',
      resolve: (street: Street): Promise<AreaPlan[] | null> => getAreaPlansByBBox(bboxf(street.geometry), 4326)
    },
    masterStreetPlans: {
      type: GraphQLList(masterStreetPlanType),
      description: 'The master street plans that intersect with the bounding box of this street',
      resolve: (street: Street): Promise<MasterStreetPlan[] | null> =>
        getMasterStreetPlansByBBox(bboxf(street.geometry), 4326)
    },
    relatedStreets: {
      type: GraphQLList(streetType),
      description: 'The street segments that adjoin this street segment',
      resolve: async (street: Street): Promise<Street[]> => {
        const url = 'https://www.portlandmaps.com/arcgis/rest/services/Public/COP_OpenData_Transportation/MapServer/68';

        const res = await axios
          .get<turf.FeatureCollection>(`${url}/query`, {
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
export function parseStreet(feature: Feature): Street {
  const geometry = ArcGISParser.parse(feature).geometry as turf.LineString;

  if (!feature.attributes) {
    return {
      geometry
    };
  }

  const name = feature.attributes.StreetName ? feature.attributes.StreetName.trim() : 'Unnamed segment';

  return {
    id: feature.attributes.TranPlanID,
    name: name ? name : 'Unnamed segment',
    geometry,
    classifications: {
      traffic: feature.attributes.Traffic,
      transit: feature.attributes.Transit,
      bicycle: feature.attributes.Bicycle,
      pedestrian: feature.attributes.Pedestrian,
      freight: feature.attributes.Freight,
      emergency: feature.attributes.Emergency,
      design: feature.attributes.Design,
      greenscape: feature.attributes.Greenscape
    }
  };
}

/**
 * Helper function to get a street by ID.
 */
export async function getStreet(id: string): Promise<Street | null> {
  // Returning a promise just to illustrate GraphQL.js's support.
  for (const url of URLS) {
    const res = await axios.get(`${url}/query`, {
      params: {
        f: 'json',
        where: `TranPlanID='${id}'`,
        outSR: '4326',
        outFields: '*'
      }
    });

    if (res.status == 200 && res.data && res.data.features) {
      const data = res.data.features;

      if (data) {
        return data.map((value: Feature) => {
          return parseStreet(value);
        });
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
    const res = await axios.get(`${url}/query`, {
      params: {
        f: 'json',
        geometryType: 'esriGeometryEnvelope',
        geometry: bbox.join(','),
        spatialRel: 'esriSpatialRelIntersects',
        inSR: '4326',
        outSR: '4326',
        outFields: '*'
      }
    });

    if (res.status == 200 && res.data && res.data.features) {
      const data = res.data.features;

      return data.map((value: Feature) => {
        return parseStreet(value);
      });
    }
  }

  return null;
}
