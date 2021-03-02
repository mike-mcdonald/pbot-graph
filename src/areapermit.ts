import { GraphQLBoolean, GraphQLObjectType, GraphQLString, isValidNameError } from 'graphql';
import axios from 'axios';
import * as https from 'https';

import * as fastxml from 'fast-xml-parser';

export type AreaPermit = {
  Code: string;
  HasPermit: boolean;
};

const ValidParkingZones = [
  'APP Zone A',
  'APP Zone B',
  'APP Zone C',
  'APP Zone D',
  'APP Zone E',
  'APP Zone F',
  'APP Zone G',
  'APP Zone H',
  'APP Zone I',
  'APP Zone J',
  'APP Zone K',
  'APP Zone L',
  'APP Zone M',
  'APP Zone N',
  'APP Zone R',
  'APP Zone S',
  'APP Zone T',
  'APP Zone U'
];

export const areaPermitType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPermit',
  description: 'AreaPermitType',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    Code: {
      type: GraphQLString,
      description: 'Licence plate being queried.'
    },
    HasPermit: {
      type: GraphQLBoolean,
      description: 'Has a valid permit.'
    }
  })
});

async function callCaleAPI(id: string): Promise<string> {
  const webServiceURL = `https://webservice.mdc.dmz.caleaccess.com/cwo2exportservice/Enforcement/5/EnforcementService.svc/get/${id}/5`;

  const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  try {
    /*
    const result = await axiosInstance.get(webServiceURL, {
      headers: {
        'content-type': 'application/json',
        Authorization: ''
      }
    });
    return result.data;
    */

    return `<ArrayOfValidParkingData xmlns="http://schema.caleaccess.com/cwo2exportservice/Enforcement/5/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><ValidParkingData><Amount>0</Amount><Article><Id>1002</Id><Name>Residential Daily Guest</Name></Article><Code>613JFV</Code><ContainsTerminalOutOfCommunication i:nil="true"/><DateChangedUtc>2021-02-24T14:18:44</DateChangedUtc><DateCreatedUtc>2021-02-24T14:18:44</DateCreatedUtc><EndDateUtc>2021-03-27T04:59:00</EndDateUtc><IsExpired>false</IsExpired><ParkingSpace i:nil="true"/><ParkingZone><Key>778</Key><Name>Zone A</Name><Number i:nil="true"/></ParkingZone><PostPayment><PostPaymentNetworkName/><PostPaymentTransactionID i:nil="true"/><PostPaymentTransactionStatusKey i:nil="true"/></PostPayment><PurchaseDateUtc>2021-02-24T14:18:19</PurchaseDateUtc><StartDateUtc>2021-02-24T14:18:19</StartDateUtc><Tariff><Id>2501</Id><Name>Residential Daily Guest Allotment - 1.50$</Name></Tariff><Terminal><Id>Zone A</Id><Latitude/><Longitude/><ParentNode>Permit </ParentNode></Terminal><TicketNumber>14458</TicketNumber><Zone>APP Zone A</Zone></ValidParkingData></ArrayOfValidParkingData>`;
    //return `<ArrayOfValidParkingData xmlns="http://schema.caleaccess.com/cwo2exportservice/Enforcement/5/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"/>`;
  } catch {
    return 'I\'v got a bad feeling about this.';
  }
}

export async function lookupAreaPermit(id: string): Promise<AreaPermit | null> {
  if (id == null) {
    return null;
  } else {
    const xmlResponse = await callCaleAPI(id);

    //console.log('response', xmlResponse);

    const xmlResponseObj = fastxml.parse(xmlResponse);

    try {
      //const validateID = xmlResponseObj.ArrayOfValidParkingData.ValidParkingData.Code;
      const StartDateUtcStr: string = xmlResponseObj.ArrayOfValidParkingData.ValidParkingData.StartDateUtc;
      const EndDateUtcStr: string = xmlResponseObj.ArrayOfValidParkingData.ValidParkingData.EndDateUtc;

      const CurrentDate = new Date();
      const StartDateUtc = new Date(StartDateUtcStr);
      const EndDateUtc = new Date(EndDateUtcStr);
      const ParkingZone: string = xmlResponseObj.ArrayOfValidParkingData.ValidParkingData.Zone;

      //console.log('Code(ID):', id);

      //console.log('CurrentDate:', CurrentDate.toISOString());
      //console.log('StartDateUtcStr:', StartDateUtcStr);
      //console.log('StartDateUtc:', StartDateUtc);
      //console.log('EndDateUtcStr:', EndDateUtcStr);
      //console.log('EndDateUtc:', EndDateUtc);

      //console.log('zone', ParkingZone);

      let inValidZone = false;
      if (ValidParkingZones.includes(ParkingZone)) {
        inValidZone = true;
        //console.log('in the correct zone', ParkingZone);
      }

      let hasValidDate = false;
      if (StartDateUtc <= CurrentDate && EndDateUtc >= CurrentDate) {
        //console.log('It has a valid date.');
        hasValidDate = true;
      }

      let hasValidPermit = false;
      if (inValidZone && hasValidDate) {
        hasValidPermit = true;
      }

      // SET RANDOM FOUND/NOT FOUND
      hasValidPermit = Math.random() >= 0.5;

      return {
        Code: id,
        HasPermit: hasValidPermit
      };
    } catch {
      return {
        Code: id,
        HasPermit: false
      };
    }
  }
}
