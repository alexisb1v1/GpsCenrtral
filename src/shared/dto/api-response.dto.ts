// src/shared/dto/api-response.dto.ts

export interface ApiResponseDto<T> {
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiResponseMeta {
  pagination?: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
  timestamp: string;
}
