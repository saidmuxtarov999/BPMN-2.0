export type BPMNElementType =
  // Events
  | 'startEvent'
  | 'endEvent'
  | 'intermediateCatchEvent'
  | 'intermediateThrowEvent'
  | 'timerEvent'
  | 'messageStartEvent'
  | 'errorEndEvent'
  | 'terminateEndEvent'
  // Tasks
  | 'task'
  | 'userTask'
  | 'serviceTask'
  | 'sendTask'
  | 'receiveTask'
  | 'manualTask'
  | 'scriptTask'
  | 'businessRuleTask'
  | 'subProcess'
  // Gateways
  | 'exclusiveGateway'
  | 'parallelGateway'
  | 'inclusiveGateway'
  | 'eventBasedGateway'
  // Data & Artifacts
  | 'dataObjectReference'
  | 'dataStoreReference'
  | 'textAnnotation';

export interface Swimlane {
  id: string;
  name: string;
  role: string;
  order: number;
  height?: number;
}

export interface Pool {
  id: string;
  name: string;
  lanes: Swimlane[];
}

export interface UserStory {
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
}

export interface BPMNNode {
  id: string;
  type: BPMNElementType;
  name: string;
  laneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
  assigneeRole?: string;
  systemComponent?: string;
  inputs?: string[];
  outputs?: string[];
  riskOrGap?: string;
  userStory?: UserStory;
  storyPoints?: number;
  syncStatus?: 'synced' | 'pending' | 'draft';
  syncId?: string;
}

export interface SequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
  name?: string;
  conditionExpression?: string;
  isDefault?: boolean;
  isException?: boolean;
  waypoints?: { x: number; y: number }[];
}

export interface RaciItem {
  taskId: string;
  taskName: string;
  role: string;
  code: 'R' | 'A' | 'C' | 'I';
}

export interface ProcessKPI {
  metric: string;
  baseline: string;
  target: string;
}

export interface IntegrationTouchpoint {
  system: string;
  protocol: string;
  direction: 'Inbound' | 'Outbound' | 'Bi-directional';
  payloadSummary: string;
}

export interface GapAnalysisItem {
  id: string;
  category: 'Compliance' | 'Bottleneck' | 'Automation' | 'Integration' | 'Security';
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  recommendation: string;
}

export interface ProcessDefinition {
  id: string;
  name: string;
  version: string;
  lastUpdated: string;
  description: string;
  pools: Pool[];
  nodes: BPMNNode[];
  flows: SequenceFlow[];
  raciMatrix: RaciItem[];
  businessObjectives: string[];
  painPointsAddressed: string[];
  kpis: ProcessKPI[];
  integrationTouchpoints: IntegrationTouchpoint[];
  gapAnalysis: GapAnalysisItem[];
}

export type PMPlatform = 'jira' | 'azure_devops' | 'linear' | 'asana' | 'trello' | 'github';

export interface PMSyncConfig {
  platform: PMPlatform;
  projectKey: string;
  issueType: string;
  webhookUrl?: string;
  apiTokenMasked?: string;
  autoSync: boolean;
}

export interface PMSyncItem {
  id: string;
  nodeId: string;
  title: string;
  type: string;
  description: string;
  acceptanceCriteria: string[];
  assigneeRole: string;
  storyPoints: number;
  status: 'Draft' | 'Synced' | 'Failed';
  externalKey?: string;
  lastSyncedAt?: string;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action:
    | 'ENCRYPT_VAULT'
    | 'DECRYPT_VAULT'
    | 'SANITIZE_PII'
    | 'EXPORT_BPMN'
    | 'PM_SYNC'
    | 'KEY_ROTATION'
    | 'IMPORT_TEMPLATE'
    | 'GENERATE_BPMN'
    | 'REFINE_BPMN';
  details: string;
  integrityHash: string;
}
