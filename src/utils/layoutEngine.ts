import { ProcessDefinition, BPMNNode, SequenceFlow } from '../types/bpmn';

export function autoLayoutProcess(process: ProcessDefinition): ProcessDefinition {
  const pool = process.pools[0];
  if (!pool || !pool.lanes.length) return process;

  const laneHeight = 160;
  const poolStartY = 40;
  const startX = 120;
  const nodeSpacingX = 170;

  // Group nodes by lane
  const laneIndexMap = new Map<string, number>();
  pool.lanes.forEach((lane, idx) => {
    laneIndexMap.set(lane.id, idx);
  });

  // Determine an ordering for nodes using flow adjacency
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  process.nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  });

  process.flows.forEach((flow) => {
    if (adj.has(flow.sourceRef)) {
      adj.get(flow.sourceRef)!.push(flow.targetRef);
    }
    if (inDegree.has(flow.targetRef)) {
      inDegree.set(flow.targetRef, (inDegree.get(flow.targetRef) || 0) + 1);
    }
  });

  // Compute topological rank / column
  const rank = new Map<string, number>();
  const queue: string[] = [];

  process.nodes.forEach((node) => {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
      rank.set(node.id, 0);
    }
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = rank.get(curr) || 0;
    const neighbors = adj.get(curr) || [];

    for (const next of neighbors) {
      const nextRank = Math.max(rank.get(next) || 0, currRank + 1);
      rank.set(next, nextRank);
      queue.push(next);
    }
  }

  // Position nodes
  const updatedNodes: BPMNNode[] = process.nodes.map((node) => {
    const laneIdx = laneIndexMap.get(node.laneId) ?? 0;
    const laneY = poolStartY + laneIdx * laneHeight;

    let width = 120;
    let height = 60;

    if (node.type.includes('Event')) {
      width = 36;
      height = 36;
    } else if (node.type.includes('Gateway')) {
      width = 50;
      height = 50;
    } else if (node.type === 'dataObjectReference' || node.type === 'dataStoreReference') {
      width = 46;
      height = 54;
    }

    const col = rank.get(node.id) ?? 0;
    const computedX = startX + col * nodeSpacingX;
    const computedY = laneY + (laneHeight - height) / 2;

    return {
      ...node,
      width,
      height,
      x: computedX,
      y: computedY,
    };
  });

  // Calculate waypoints for sequence flows
  const updatedFlows: SequenceFlow[] = process.flows.map((flow) => {
    const sourceNode = updatedNodes.find((n) => n.id === flow.sourceRef);
    const targetNode = updatedNodes.find((n) => n.id === flow.targetRef);

    if (!sourceNode || !targetNode) return flow;

    const sourcePoint = {
      x: sourceNode.x + sourceNode.width,
      y: sourceNode.y + sourceNode.height / 2,
    };

    const targetPoint = {
      x: targetNode.x,
      y: targetNode.y + targetNode.height / 2,
    };

    // If different Y levels (cross-lane or branching), add orthogonal waypoints
    const waypoints: { x: number; y: number }[] = [sourcePoint];

    if (Math.abs(sourcePoint.y - targetPoint.y) > 15) {
      const midX = (sourcePoint.x + targetPoint.x) / 2;
      waypoints.push({ x: midX, y: sourcePoint.y });
      waypoints.push({ x: midX, y: targetPoint.y });
    }

    waypoints.push(targetPoint);

    return {
      ...flow,
      waypoints,
    };
  });

  return {
    ...process,
    nodes: updatedNodes,
    flows: updatedFlows,
  };
}

export const applyAutoLayout = autoLayoutProcess;
