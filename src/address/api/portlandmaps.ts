import qs from 'querystring';

import axios from 'axios';

import { AddressSearchAPI } from '../types';
import { AddressCandidate } from '@/address/types';
import { SpatialReference } from '@/types';

export class PortlandmapsSuggest implements AddressSearchAPI {
  async search(query: string, options?: { city?: string }): Promise<AddressCandidate[]> {
    let body = {
      query,
      // eslint-disable-next-line @typescript-eslint/camelcase
      api_key: process.env.PORTLANDMAPS_API_KEY
    };
    if (options) {
      body = Object.assign(body, options);
    }
    const res = await axios.post<{
      status: string;
      spatialReference: SpatialReference;
      candidates: AddressCandidate[];
    }>('https://www.portlandmaps.com/api/suggest/', qs.stringify(body), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (res.status === 200 && res.data && res.data.status === 'success') {
      const data = res.data.candidates;

      return data.map((value: AddressCandidate) => {
        value.location.spatialReference = res.data.spatialReference;
        return value;
      });
    } else throw new Error('No addresses found');
  }
}

export class PortlandmapsAssessor implements AddressSearchAPI {
  async search(query: string, options?: { city?: string }): Promise<AddressCandidate[]> {
    let body = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      property_id: query,
      // eslint-disable-next-line @typescript-eslint/camelcase
      api_key: process.env.PORTLANDMAPS_API_KEY
    };
    if (options) {
      body = Object.assign(body, options);
    }
    const res = await axios.post<{ total: number; status: string; results: any[] }>(
      'https://www.portlandmaps.com/api/assessor/',
      qs.stringify(body),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (res.status === 200 && res.data && res.data.status === 'success') {
      const data = res.data.results;

      return data.map((value: any) => {
        const candidate: AddressCandidate = {
          address: value.address,
          location: {
            x: value.x_web_mercator,
            y: value.y_web_mercator,
            spatialReference: {
              wkid: 102100,
              latestWkid: 3857
            }
          },
          attributes: {
            type: 'Property',
            city: value.city,
            // eslint-disable-next-line @typescript-eslint/camelcase
            zip_code: value.zip_code,
            state: value.state,
            county: value.county
          }
        };
        return candidate;
      });
    } else throw new Error('No addresses found');
  }
}
