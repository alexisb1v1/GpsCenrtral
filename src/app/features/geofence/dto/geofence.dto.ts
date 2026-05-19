export interface GeofenceDto {
  id: string;
  name: string;
  type: 'START' | 'CHECKPOINT' | 'END';
  status: 'ACTIVE' | 'DELETE';
}
