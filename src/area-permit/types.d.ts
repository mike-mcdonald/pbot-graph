export type AreaPermitZone = {
  value: string;
  text: string;
};

export type AreaPermit = {
  licensePlate: string;
  zone?: AreaPermitZone;
  isValid: boolean;
};
