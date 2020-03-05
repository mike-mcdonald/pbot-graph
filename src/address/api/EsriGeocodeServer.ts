import qs from 'querystring';

import axios from 'axios';

import { IAddressSearchAPI } from './IAddressSearchAPI';
import { AddressCandidate } from '@/address/types';

export class ESRIGeocodeServer implements IAddressSearchAPI {
  async search(query: string, options?: any): Promise<AddressCandidate[]> {
    let body = {
      'Single Line Input': query,
      f: 'pjson'
    };
    if (options) {
      body = Object.assign(body, options);
    }
    const res = await axios.post(
      'https://www.portlandmaps.com/arcgis/rest/services/Public/Address_Geocoding_PDX/GeocodeServer/findAddressCandidates',
      qs.stringify(body),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (res.status == 200 && res.data && res.data.candidates) {
      const candidates = res.data.candidates;

      return candidates.map((value: AddressCandidate) => {
        return value;
      });
    } else throw new Error('No addresses found');
  }
}
