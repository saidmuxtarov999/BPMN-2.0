import { ProcessDefinition, BPMNNode, SequenceFlow, BPMNElementType } from '../types/bpmn';

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mapToBpmnTag(type: BPMNElementType): string {
  switch (type) {
    case 'startEvent':
    case 'messageStartEvent':
      return 'bpmn:startEvent';
    case 'endEvent':
    case 'errorEndEvent':
    case 'terminateEndEvent':
      return 'bpmn:endEvent';
    case 'intermediateCatchEvent':
    case 'timerEvent':
      return 'bpmn:intermediateCatchEvent';
    case 'intermediateThrowEvent':
      return 'bpmn:intermediateThrowEvent';
    case 'userTask':
      return 'bpmn:userTask';
    case 'serviceTask':
      return 'bpmn:serviceTask';
    case 'sendTask':
      return 'bpmn:sendTask';
    case 'receiveTask':
      return 'bpmn:receiveTask';
    case 'manualTask':
      return 'bpmn:manualTask';
    case 'scriptTask':
      return 'bpmn:scriptTask';
    case 'businessRuleTask':
      return 'bpmn:businessRuleTask';
    case 'subProcess':
      return 'bpmn:subProcess';
    case 'exclusiveGateway':
      return 'bpmn:exclusiveGateway';
    case 'parallelGateway':
      return 'bpmn:parallelGateway';
    case 'inclusiveGateway':
      return 'bpmn:inclusiveGateway';
    case 'eventBasedGateway':
      return 'bpmn:eventBasedGateway';
    case 'dataObjectReference':
      return 'bpmn:dataObjectReference';
    case 'dataStoreReference':
      return 'bpmn:dataStoreReference';
    case 'textAnnotation':
      return 'bpmn:textAnnotation';
    case 'task':
    default:
      return 'bpmn:task';
  }
}

export function generateBpmn20Xml(process: ProcessDefinition): string {
  const processId = `Process_${process.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const collaborationId = `Collaboration_${process.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const diagramId = `BPMNDiagram_1`;
  const planeId = `BPMNPlane_1`;

  const pool = process.pools[0] || {
    id: 'Pool_1',
    name: process.name,
    lanes: [
      { id: 'Lane_1', name: 'Primary Lane', role: 'Business User', order: 0 }
    ]
  };

  const poolParticipantId = `Participant_${pool.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  // Build lane sets
  let laneSetXml = `    <bpmn:laneSet id="LaneSet_${pool.id}">\n`;
  for (const lane of pool.lanes) {
    const laneNodeRefs = process.nodes
      .filter((n) => n.laneId === lane.id)
      .map((n) => `        <bpmn:flowNodeRef>${escapeXml(n.id)}</bpmn:flowNodeRef>`)
      .join('\n');

    laneSetXml += `      <bpmn:lane id="${escapeXml(lane.id)}" name="${escapeXml(lane.name)}">\n`;
    if (laneNodeRefs) {
      laneSetXml += `${laneNodeRefs}\n`;
    }
    laneSetXml += `      </bpmn:lane>\n`;
  }
  laneSetXml += `    </bpmn:laneSet>\n`;

  // Build nodes XML
  let nodesXml = '';
  for (const node of process.nodes) {
    const tag = mapToBpmnTag(node.type);
    const incomingFlows = process.flows
      .filter((f) => f.targetRef === node.id)
      .map((f) => `      <bpmn:incoming>${escapeXml(f.id)}</bpmn:incoming>`)
      .join('\n');
    const outgoingFlows = process.flows
      .filter((f) => f.sourceRef === node.id)
      .map((f) => `      <bpmn:outgoing>${escapeXml(f.id)}</bpmn:outgoing>`)
      .join('\n');

    let extraEventsXml = '';
    if (node.type === 'messageStartEvent') {
      extraEventsXml = '      <bpmn:messageEventDefinition id="MessageDef_' + node.id + '" />\n';
    } else if (node.type === 'timerEvent') {
      extraEventsXml = '      <bpmn:timerEventDefinition id="TimerDef_' + node.id + '" />\n';
    } else if (node.type === 'errorEndEvent') {
      extraEventsXml = '      <bpmn:errorEventDefinition id="ErrorDef_' + node.id + '" />\n';
    } else if (node.type === 'terminateEndEvent') {
      extraEventsXml = '      <bpmn:terminateEventDefinition id="TerminateDef_' + node.id + '" />\n';
    }

    let documentationXml = '';
    if (node.description) {
      documentationXml = `      <bpmn:documentation>${escapeXml(node.description)}</bpmn:documentation>\n`;
    }

    nodesXml += `    <${tag} id="${escapeXml(node.id)}" name="${escapeXml(node.name)}">\n`;
    if (documentationXml) nodesXml += documentationXml;
    if (incomingFlows) nodesXml += `${incomingFlows}\n`;
    if (outgoingFlows) nodesXml += `${outgoingFlows}\n`;
    if (extraEventsXml) nodesXml += extraEventsXml;
    nodesXml += `    </${tag}>\n`;
  }

  // Build Sequence Flows
  let flowsXml = '';
  for (const flow of process.flows) {
    flowsXml += `    <bpmn:sequenceFlow id="${escapeXml(flow.id)}" sourceRef="${escapeXml(
      flow.sourceRef
    )}" targetRef="${escapeXml(flow.targetRef)}"${
      flow.name ? ` name="${escapeXml(flow.name)}"` : ''
    }>\n`;
    if (flow.conditionExpression) {
      flowsXml += `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(
        flow.conditionExpression
      )}</bpmn:conditionExpression>\n`;
    }
    flowsXml += `    </bpmn:sequenceFlow>\n`;
  }

  // Calculate DI bounds for Pool and Lanes
  const minX = Math.min(...process.nodes.map((n) => n.x), 200) - 80;
  const maxX = Math.max(...process.nodes.map((n) => n.x + n.width), 1000) + 120;
  const poolWidth = Math.max(maxX - minX + 160, 1100);
  const laneHeight = 160;
  const poolHeight = Math.max(pool.lanes.length * laneHeight, 480);
  const poolX = Math.max(minX - 40, 40);
  const poolY = 40;

  // Build Diagram Interchange (BPMNDI)
  let diShapes = '';
  // Pool Shape
  diShapes += `      <bpmndi:BPMNShape id="${poolParticipantId}_di" bpmnElement="${poolParticipantId}" isHorizontal="true">\n`;
  diShapes += `        <dc:Bounds x="${poolX}" y="${poolY}" width="${poolWidth}" height="${poolHeight}" />\n`;
  diShapes += `      </bpmndi:BPMNShape>\n`;

  // Lane Shapes
  pool.lanes.forEach((lane, idx) => {
    const laneY = poolY + idx * laneHeight;
    diShapes += `      <bpmndi:BPMNShape id="${escapeXml(lane.id)}_di" bpmnElement="${escapeXml(
      lane.id
    )}" isHorizontal="true">\n`;
    diShapes += `        <dc:Bounds x="${poolX + 30}" y="${laneY}" width="${poolWidth - 30}" height="${laneHeight}" />\n`;
    diShapes += `      </bpmndi:BPMNShape>\n`;
  });

  // Node Shapes
  for (const node of process.nodes) {
    diShapes += `      <bpmndi:BPMNShape id="${escapeXml(node.id)}_di" bpmnElement="${escapeXml(node.id)}">\n`;
    diShapes += `        <dc:Bounds x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" />\n`;
    diShapes += `        <bpmndi:BPMNLabel />\n`;
    diShapes += `      </bpmndi:BPMNShape>\n`;
  }

  // Flow Edges
  let diEdges = '';
  for (const flow of process.flows) {
    const source = process.nodes.find((n) => n.id === flow.sourceRef);
    const target = process.nodes.find((n) => n.id === flow.targetRef);

    const startX = source ? source.x + source.width : 100;
    const startY = source ? source.y + source.height / 2 : 100;
    const endX = target ? target.x : 200;
    const endY = target ? target.y + target.height / 2 : 100;

    diEdges += `      <bpmndi:BPMNEdge id="${escapeXml(flow.id)}_di" bpmnElement="${escapeXml(flow.id)}">\n`;
    if (flow.waypoints && flow.waypoints.length > 0) {
      for (const wp of flow.waypoints) {
        diEdges += `        <di:waypoint x="${wp.x}" y="${wp.y}" />\n`;
      }
    } else {
      diEdges += `        <di:waypoint x="${startX}" y="${startY}" />\n`;
      if (Math.abs(startY - endY) > 20) {
        const midX = (startX + endX) / 2;
        diEdges += `        <di:waypoint x="${midX}" y="${startY}" />\n`;
        diEdges += `        <di:waypoint x="${midX}" y="${endY}" />\n`;
      }
      diEdges += `        <di:waypoint x="${endX}" y="${endY}" />\n`;
    }
    if (flow.name) {
      diEdges += `        <bpmndi:BPMNLabel />\n`;
    }
    diEdges += `      </bpmndi:BPMNEdge>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  id="Definitions_BPMN_Studio"
                  targetNamespace="http://bpmn.io/schema/bpmn"
                  exporter="BPMN Process Analyst Studio"
                  exporterVersion="2.0">
  <bpmn:collaboration id="${collaborationId}">
    <bpmn:participant id="${poolParticipantId}" name="${escapeXml(pool.name)}" processRef="${processId}" />
  </bpmn:collaboration>

  <bpmn:process id="${processId}" name="${escapeXml(process.name)}" isExecutable="false">
${laneSetXml}
${nodesXml}
${flowsXml}
  </bpmn:process>

  <bpmndi:BPMNDiagram id="${diagramId}">
    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${collaborationId}">
${diShapes}
${diEdges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
