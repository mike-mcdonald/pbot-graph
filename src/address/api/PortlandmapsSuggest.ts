import qs from 'querystring';

import axios from 'axios';

import { IAddressSearchAPI } from '@/address/api/IAddressSearchAPI';
import { AddressCandidate } from '@/address/types';

export class PortlandmapsSuggest implements IAddressSearchAPI {
  async search(query: string, options?: any): Promise<AddressCandidate[]> {
    let body = {
      query,
      // eslint-disable-next-line @typescript-eslint/camelcase
      api_key: process.env.PORTLANDMAPS_API_KEY
    };
    if (options) {
      body = Object.assign(body, options);
    }
    const res = await axios.post<{ status: string; spatialReference: any; candidates: AddressCandidate[] }>(
      'https://www.portlandmaps.com/api/suggest/',
      qs.stringify(body),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (res.status === 200 && res.data && res.data.status === 'success') {
      const data = res.data.candidates;

      return data.map((value: AddressCandidate) => {
        value.location.spatialReference = res.data.spatialReference;
        return value;
      });
    } else throw new Error('No addresses found');
  }
}
