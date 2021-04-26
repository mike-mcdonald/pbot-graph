export type AreaPermitZone = {
  id: string;
  name: string;
  visitorLimit: string;
  enforcementHours: string;
};

export type AreaPermit = {
  licensePlate: string;
  zone?: AreaPermitZone | null;
  isValid: boolean;
};
