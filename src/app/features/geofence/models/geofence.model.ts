export enum GeofenceType {
  START = 'START',
  CHECKPOINT = 'CHECKPOINT',
  END = 'END',
}

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  status: string;
}
