export type ZoneEnforcementInfo = {
  visitorLimit: string;
  enforcementHours: string;
};

export type AreaPermitZone = {
  id: string;
  name: string;
  enforcementInfo: Array<ZoneEnforcementInfo>;
};

export type AreaPermit = {
  licensePlate: string;
  zone?: AreaPermitZone | null;
  isValid: boolean;
};
