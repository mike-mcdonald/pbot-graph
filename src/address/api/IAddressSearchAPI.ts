import { AddressCandidate } from '../types';

export interface IAddressSearchAPI {
  search(query: string, options?: any): Promise<AddressCandidate[]>;
}
