import { GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList, GraphQLFloat, GraphQLInt } from 'graphql';
import { BBox, Feature, Polygon, Geometry } from '@turf/helpers';
import bboxf from '@turf/bbox';
import axios from 'axios';
import proj4 from 'proj4';
import { GeometryObject } from '../geojson';

// ESRI maps use this wkid
// https://spatialreference.org/ref/epsg/2913/proj4/
proj4.defs(
  '2913',
  '+proj=lcc +lat_1=46 +lat_2=44.33333333333334 +lat_0=43.66666666666666 +lon_0=-120.5 +x_0=2500000.0001424 +y_0=0 +ellps=GRS80 +to_meter=0.3048 +no_defs'
);

const PLANS_URL =
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/Master_Street_Plans/FeatureServer/3';

const FEATURES_URL = [
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/Master_Street_Plans/FeatureServer/1',
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/Master_Street_Plans/FeatureServer/2'
];

const PLAN_DOCUMENTS = new Map<string, string>([
  ['AW', 'https://www.portlandoregon.gov/transportation/article/690971'],
  ['B', 'https://www.portlandoregon.gov/bps/article/88615'],
  ['C', 'https://www.portlandoregon.gov/transportation/article/520795'],
  ['CSPIC', 'https://www.portlandoregon.gov/transportation/article/690971'],
  ['DM', 'https://www.portlandoregon.gov/transportation/article/537983'],
  ['FSE', 'https://efiles.portlandoregon.gov/Record/12891541'],
  ['G', 'https://efiles.portlandoregon.gov/Record/3710192'],
  ['HI', 'https://efiles.portlandoregon.gov/Record/3661590'],
  ['NW', 'https://www.portlandoregon.gov/bps/article/76877'],
  ['OP', 'https://www.portlandoregon.gov/transportation/article/690971'],
  ['RD', 'https://www.portlandoregon.gov/transportation/article/690971'],
  ['SJ', 'https://www.portlandoregon.gov/bps/article/65700'],
  ['SP', 'https://www.portlandoregon.gov/transportation/article/690971'],
  ['SW', 'https://efiles.portlandoregon.gov/Record/12891541'],
  ['SWD', 'https://www.portlandoregon.gov/transportation/79217'],
  ['TSHNSP', 'https://efiles.portlandoregon.gov/Record/8211510'],
  ['UMC', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-162', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-BW', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-D', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-E', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-FP', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047'],
  ['UMC-J', 'http://www.portlandonline.com/shared/cfm/image.cfm?id=115047']
]);

export type MasterStreetPlanFeature = {
  id: string;
  name: string;
  label?: string;
  geometry: Geometry;
};

export type MasterStreetPlan = {
  id: string;
  name: string;
  label?: string;
  document?: string;
  features?: Array<MasterStreetPlanFeature>;
  geometry: Geometry;
  bbox: BBox;
};

const PLAN_LABEL_MAP = new Map<string, string>();

axios
  .get(PLANS_URL, {
    params: {
      f: 'json'
    }
  })
  .then(res => {
    if (res.status == 200 && res.data && res.data.fields) {
      res.data.fields.some(
        (field: { name: string; domain: { codedValues: Array<{ code: string; name: string }> } }) => {
          if (field.name === 'MSP_Area') {
            for (const value of field.domain.codedValues) {
              PLAN_LABEL_MAP.set(value.code, value.name);
            }
          }
        }
      );
    }
  });

const PLAN_FEATURE_LABEL_MAP = new Map<string, string>();
FEATURES_URL.map(async url => {
  axios
    .get(url, {
      params: {
        f: 'json'
      }
    })
    .then(res => {
      if (res.status == 200 && res.data && res.data.fields) {
        res.data.fields.some(
          (field: { name: string; domain: { codedValues: Array<{ code: string; name: string }> } }) => {
            if (field.name === 'MasterStreetPlan') {
              for (const value of field.domain.codedValues) {
                PLAN_FEATURE_LABEL_MAP.set(value.code, value.name);
              }
            }
          }
        );
      }
    });
});

/**
 * Helper function to get a streets within a bounding box.
 */
export async function getMasterStreetPlansByBBox(
  bbox: BBox,
  spatialReference: number
): Promise<MasterStreetPlan[] | null> {
  if (spatialReference != 4326) {
    [bbox[0], bbox[1]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[0], bbox[1]]);
    [bbox[2], bbox[3]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[2], bbox[3]]);
  }

  let plans = new Array<MasterStreetPlan>();

  const res = await axios
    .get(`${PLANS_URL}/query`, {
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
    .catch((err: any) => {
      throw new Error(err);
    });

  if (res.status == 200 && res.data && res.data.features) {
    const data: Feature<Polygon>[] = res.data.features;

    plans = data.map(feature => {
      if (feature.properties) {
        return {
          id: feature.properties.OBJECTID,
          name: feature.properties.MSP_Area,
          geometry: feature.geometry,
          bbox: bboxf(feature)
        };
      } else
        return {
          id: 'null',
          name: 'null',
          geometry: feature.geometry,
          bbox
        };
    });
  }

  return plans;
}

/**
 * Helper function to get a streets within a bounding box.
 */
export async function getMasterStreetPlansById(id: number): Promise<MasterStreetPlan[] | null> {
  let plans = new Array<MasterStreetPlan>();

  const res = await axios
    .get(`${PLANS_URL}/query`, {
      params: {
        f: 'geojson',
        where: `OBJECTID=${id}`,
        outSR: '4326',
        outFields: '*'
      }
    })
    .catch((err: any) => {
      throw new Error(err);
    });

  if (res.status == 200 && res.data && res.data.features) {
    const data: Feature<Polygon>[] = res.data.features;

    plans = data.map(feature => {
      if (feature.properties) {
        return {
          id: feature.properties.OBJECTID,
          name: feature.properties.MSP_Area,
          geometry: feature.geometry,
          bbox: bboxf(feature)
        };
      } else
        return {
          id: 'null',
          name: 'null',
          geometry: feature.geometry,
          bbox: bboxf(feature)
        };
    });
  }

  return plans;
}

async function getPlanFeatures(plan: MasterStreetPlan): Promise<Array<MasterStreetPlanFeature>> {
  const features = new Array<MasterStreetPlanFeature>();

  const promises = FEATURES_URL.map(async url => {
    const res = await axios
      .get(`${url}/query`, {
        params: {
          f: 'geojson',
          where: `MSP_Area='${plan.name}'`,
          outSR: '4326',
          outFields: '*'
        }
      })
      .catch((err: any) => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data: Feature<Geometry>[] = res.data.features;

      features.push(
        ...data.map(feature => {
          if (feature.properties) {
            return {
              id: feature.properties.OBJECTID,
              name: feature.properties.MasterStreetPlan,
              geometry: feature.geometry
            };
          } else
            return {
              id: 'null',
              name: 'null',
              geometry: feature.geometry
            };
        })
      );
    }
  });

  await Promise.all(promises);

  return features;
}

export const masterStreetPlanFeatureType: GraphQLObjectType = new GraphQLObjectType({
  name: 'MasterStreetPlanFeature',
  description: "A feature of a documented plan for a section of Portland's streets",
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'An integer identifer for the plan.'
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
      description: 'A machine name for the type of feature in relation to the master street plan'
    },
    label: {
      type: GraphQLString,
      description: 'A friendly name for the type of feature in relation to the master street plan',
      resolve: (feature: MasterStreetPlanFeature): string | undefined => {
        return PLAN_FEATURE_LABEL_MAP.get(feature.name);
      }
    },
    geometry: {
      type: GeometryObject,
      description: 'The GeoJSON object representing the project'
    }
  })
});

export const masterStreetPlanType: GraphQLObjectType = new GraphQLObjectType({
  name: 'MasterStreetPlan',
  description: "A documented plan for a section of Portland's streets",
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'An integer identifer for the plan.'
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
      description: 'A machine name for the plan'
    },
    label: {
      type: GraphQLString,
      description: 'A friendly name for the plan',
      resolve: (plan: MasterStreetPlan): string | undefined => {
        return PLAN_LABEL_MAP.get(plan.name);
      }
    },
    document: {
      type: GraphQLString,
      description: 'A URL for viewing a document associated with the plan',
      resolve: (plan: MasterStreetPlan): string | undefined => {
        return PLAN_DOCUMENTS.get(plan.name);
      }
    },
    features: {
      type: GraphQLList(masterStreetPlanFeatureType),
      description: 'The features related to the plan',
      resolve: async (plan: MasterStreetPlan): Promise<Array<MasterStreetPlanFeature>> => {
        return getPlanFeatures(plan);
      }
    },
    geometry: {
      type: GeometryObject,
      description: 'The GeoJSON object representing the project'
    },
    bbox: {
      type: GraphQLList(GraphQLFloat),
      description: 'The bounding box of the plan, in ESPG:4326'
    }
  })
});
