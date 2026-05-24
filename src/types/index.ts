export type ServiceType = "Service 1" | "Service 2" | "Service 3";

export interface Provider {
  _id: string;
  name: string;
  providerNumber: number;
  services: ServiceType[];
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  isMandatory: boolean;
  mandatoryFor: ServiceType[];
  poolFor: ServiceType[];
  isActive: boolean;
  assignedLeads?: Lead[];
  assignedLeadsCount?: number;
}

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  assignedProviders: Provider[];
  webhookEventId?: string;
  status: "pending" | "assigned" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface AllocationState {
  _id: string;
  serviceType: ServiceType;
  poolProviders: number[];
  currentIndex: number;
  totalAllocations: number;
}

export interface WebhookEvent {
  _id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "processed" | "failed";
  processedAt?: string;
  result?: Record<string, unknown>;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  details?: unknown;
}
