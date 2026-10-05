export interface Cell {
  id: string;
  cellId: string;
  manufacturer: string;
  model: string;
  chemistry: string;
  nominalVoltage: number;
  ratedCapacityMah: number;
  source: string;
  manufactureDate?: string | null;
  status: 'REGISTERED' | 'TESTING' | 'TESTED' | 'FAILED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  latestScore?: number | null;
  classification?: string | null;
  latestTestId?: string | null;
}

export interface CellListResponse {
  success: boolean;
  data: Cell[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CellDetailsResponse {
  success: boolean;
  data: {
    cell: Cell;
    latestTest?: any;
    latestAnalysis?: any;
    latestScore?: number | null;
    classification?: string | null;
  };
}
