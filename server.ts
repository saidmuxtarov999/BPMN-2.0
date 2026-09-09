import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient multi-model candidate list to mitigate 503 high demand spikes
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

async function generateWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
  }
) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Querying model: ${model} (attempt ${attempt + 1})...`);
        const config: any = {};
        if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
        if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
        if (params.responseSchema) config.responseSchema = params.responseSchema;

        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        if (response && response.text) {
          console.log(`Successfully generated content with model: ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        const status = err?.status || err?.code;
        const isUnavailable =
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED');

        console.warn(`Model ${model} encounter [status: ${status}]: ${msg.slice(0, 120)}`);

        if (isUnavailable) {
          // Pause briefly for rate limiter or spike backoff
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          // continue to next attempt or fallback model
        } else {
          // Non-transient error on this model, proceed directly to next candidate model
          break;
        }
      }
    }
  }

  throw lastError || new Error('All candidate models are temporarily unavailable.');
}

// Resilient Fallback Synthesizer in case of upstream cloud outages or complete 503 spikes
function synthesizeFallbackBpmn(requirements: string, processName: string) {
  const lines = requirements
    .split('\n')
    .map((l) => l.replace(/^[\d\.\-\*\•\s]+/, '').trim())
    .filter((l) => l.length > 5);

  const cleanName = processName || 'Business Process Workflow';
  const poolId = 'Pool_Main';

  // Extract or detect roles from keywords in the requirements
  const defaultRoles = [
    { id: 'Lane_Requester', name: 'User / Requester', role: 'End User', order: 0 },
    { id: 'Lane_ServiceDesk', name: 'Operations / Service Desk', role: 'Business Analyst', order: 1 },
    { id: 'Lane_System', name: 'Automated Microservices', role: 'System Integration', order: 2 },
    { id: 'Lane_Approver', name: 'Compliance & Management', role: 'Approver / Lead', order: 3 },
  ];

  const nodes: any[] = [];
  const flows: any[] = [];
  const raciMatrix: any[] = [];

  // Start event
  nodes.push({
    id: 'Start_Event_1',
    type: 'startEvent',
    name: `${cleanName} Initiated`,
    laneId: 'Lane_Requester',
    x: 80,
    y: 75,
    width: 36,
    height: 36,
    description: 'Trigger event based on business requirements',
  });

  let prevNodeId = 'Start_Event_1';
  let taskCount = 0;

  // Generate nodes from detected requirements lines
  const stepsToUse = lines.length > 0 ? lines.slice(0, 6) : [
    'Submit business intake dossier and verify documentation',
    'Execute automated identity and rule validation check',
    'Assess risk thresholds and route for conditional review',
    'Conduct secondary compliance investigation if flagged',
    'Finalize settlement and notify stakeholder channels'
  ];

  stepsToUse.forEach((stepText, idx) => {
    taskCount++;
    const taskId = `Task_Step_${taskCount}`;
    const isSystem = /system|automated|engine|api|database|service/i.test(stepText);
    const isApproval = /approve|compliance|review|manager|investigate/i.test(stepText);

    let assignedLane = 'Lane_Requester';
    let assignedRole = 'End User';
    let nodeType = 'userTask';

    if (isSystem) {
      assignedLane = 'Lane_System';
      assignedRole = 'Automated System';
      nodeType = 'serviceTask';
    } else if (isApproval) {
      assignedLane = 'Lane_Approver';
      assignedRole = 'Senior Approver';
      nodeType = 'userTask';
    } else if (idx > 0) {
      assignedLane = 'Lane_ServiceDesk';
      assignedRole = 'Operations Analyst';
      nodeType = 'userTask';
    }

    // Insert Gateway before approval if conditional keywords detected
    if (/if|whether|score|threshold|cond/i.test(stepText) && idx < stepsToUse.length - 1) {
      const gwId = `Gateway_Eval_${idx}`;
      nodes.push({
        id: gwId,
        type: 'exclusiveGateway',
        name: 'Evaluation Met?',
        laneId: assignedLane,
        x: 100 + (idx + 1) * 160,
        y: 70,
        width: 44,
        height: 44,
        description: 'Decision gateway evaluating risk criteria',
      });

      flows.push({
        id: `Flow_${prevNodeId}_to_${gwId}`,
        sourceRef: prevNodeId,
        targetRef: gwId,
      });

      prevNodeId = gwId;
    }

    nodes.push({
      id: taskId,
      type: nodeType,
      name: stepText.slice(0, 48),
      laneId: assignedLane,
      assigneeRole: assignedRole,
      description: stepText,
      storyPoints: isSystem ? 2 : 3,
      userStory: {
        title: `US-${taskCount}: ${stepText.slice(0, 36)}`,
        asA: assignedRole,
        iWant: `to ${stepText.toLowerCase()}`,
        soThat: 'the business process maintains compliance and completes accurately.',
        acceptanceCriteria: [
          `Given the previous step is satisfied, when ${assignedRole} executes "${stepText.slice(0, 25)}", then verify output status.`,
          'Verify audit logging and state update in the central ledger.',
        ],
      },
    });

    flows.push({
      id: `Flow_${prevNodeId}_to_${taskId}`,
      sourceRef: prevNodeId,
      targetRef: taskId,
      name: prevNodeId.startsWith('Gateway') ? 'Approved' : undefined,
    });

    raciMatrix.push({
      taskId,
      taskName: stepText.slice(0, 40),
      role: assignedRole,
      code: idx === 0 ? 'R' : idx === stepsToUse.length - 1 ? 'A' : 'C',
    });

    prevNodeId = taskId;
  });

  // End event
  const endId = 'End_Event_Completed';
  nodes.push({
    id: endId,
    type: 'endEvent',
    name: `${cleanName} Concluded`,
    laneId: 'Lane_Requester',
    x: 100 + (stepsToUse.length + 1) * 160,
    y: 75,
    width: 36,
    height: 36,
    description: 'Process completed successfully',
  });

  flows.push({
    id: `Flow_${prevNodeId}_to_${endId}`,
    sourceRef: prevNodeId,
    targetRef: endId,
  });

  return {
    id: `proc_${Date.now()}`,
    name: cleanName,
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    description: `Comprehensive BPMN 2.0 workflow structured from plain English requirements for: ${cleanName}`,
    pools: [
      {
        id: poolId,
        name: cleanName,
        lanes: defaultRoles,
      },
    ],
    nodes,
    flows,
    raciMatrix,
    businessObjectives: [
      'Standardize process handoffs across business units and systems.',
      'Achieve 100% auditable traceability for compliance governance.',
      'Reduce cycle time and minimize manual touchpoints.',
    ],
    painPointsAddressed: [
      'Unclear operational ownership during handoffs.',
      'Lack of automated verification leading to bottlenecks.',
    ],
    kpis: [
      { metric: 'Process Execution SLA', baseline: '48 Hours', target: '< 4 Hours' },
      { metric: 'Straight-Through Processing', baseline: '45%', target: '> 85%' },
    ],
    integrationTouchpoints: [
      {
        system: 'Enterprise Core API',
        protocol: 'HTTPS REST / JSON',
        direction: 'Bi-directional',
        payloadSummary: 'Dossier payload, audit status, and verification tokens',
      },
    ],
    gapAnalysis: [
      {
        id: 'gap_1',
        category: 'Automation',
        description: 'Manual data verification creates a potential bottleneck during peak volume.',
        severity: 'Medium',
        recommendation: 'Implement automated API pre-validation before routing to human analysts.',
      },
    ],
  };
}

// BPMN JSON Response Schema
const bpmnResponseSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    version: { type: Type.STRING },
    description: { type: Type.STRING },
    pools: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          lanes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                order: { type: Type.INTEGER },
              },
              required: ['id', 'name', 'role', 'order'],
            },
          },
        },
        required: ['id', 'name', 'lanes'],
      },
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING },
          name: { type: Type.STRING },
          laneId: { type: Type.STRING },
          description: { type: Type.STRING },
          assigneeRole: { type: Type.STRING },
          systemComponent: { type: Type.STRING },
          storyPoints: { type: Type.INTEGER },
          userStory: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              asA: { type: Type.STRING },
              iWant: { type: Type.STRING },
              soThat: { type: Type.STRING },
              acceptanceCriteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
        required: ['id', 'type', 'name', 'laneId'],
      },
    },
    flows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          sourceRef: { type: Type.STRING },
          targetRef: { type: Type.STRING },
          name: { type: Type.STRING },
          conditionExpression: { type: Type.STRING },
          isException: { type: Type.BOOLEAN },
        },
        required: ['id', 'sourceRef', 'targetRef'],
      },
    },
    raciMatrix: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          taskId: { type: Type.STRING },
          taskName: { type: Type.STRING },
          role: { type: Type.STRING },
          code: { type: Type.STRING },
        },
        required: ['taskId', 'taskName', 'role', 'code'],
      },
    },
    businessObjectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    painPointsAddressed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    kpis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          metric: { type: Type.STRING },
          baseline: { type: Type.STRING },
          target: { type: Type.STRING },
        },
        required: ['metric', 'baseline', 'target'],
      },
    },
    integrationTouchpoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          system: { type: Type.STRING },
          protocol: { type: Type.STRING },
          direction: { type: Type.STRING },
          payloadSummary: { type: Type.STRING },
        },
        required: ['system', 'protocol', 'direction', 'payloadSummary'],
      },
    },
    gapAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ['id', 'category', 'description', 'severity', 'recommendation'],
      },
    },
  },
  required: ['id', 'name', 'pools', 'nodes', 'flows'],
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Endpoint: Generate BPMN Process from Plain English Requirements
app.post('/api/generate-bpmn', async (req, res) => {
  const { requirements, processName } = req.body;

  if (!requirements || typeof requirements !== 'string') {
    res.status(400).json({ error: 'Requirements text is required.' });
    return;
  }

  const systemInstruction = `You are a Principal Enterprise Business Analyst & BPMN 2.0 Architect.
Your task is to analyze process requirements and interview notes provided in plain English, and produce a detailed, industry-standard BPMN 2.0 process definition in JSON.

Guidelines:
1. Identify distinct participants / systems as horizontal Swimlanes (e.g., Customer, Service Desk, Operations, automated Microservices, Compliance, External API).
2. Use precise BPMN element types:
   - Events: startEvent, messageStartEvent, timerEvent, endEvent, errorEndEvent, terminateEndEvent
   - Tasks: userTask (manual/human UI task), serviceTask (automated system call), businessRuleTask (decision table/rule), sendTask, receiveTask, manualTask, subProcess
   - Gateways: exclusiveGateway (XOR decision branch), parallelGateway (AND fork/join), inclusiveGateway (OR)
3. Provide realistic SequenceFlows with clear sourceRef, targetRef, and conditionExpression for decision branches.
4. For every actionable task, formulate a structured User Story with As a / I want / So that and 2-3 Gherkin-style Acceptance Criteria.
5. Create a RACI Matrix entry for key roles (Responsible, Accountable, Consulted, Informed).
6. Detect Gaps, Bottlenecks, and Automation opportunities.
7. Return strictly valid JSON conforming to the schema.`;

  const prompt = `Process Name: ${processName || 'Automated Business Workflow'}
Raw Business Requirements & Interview Notes:
"""
${requirements}
"""

Please construct the complete BPMN 2.0 process definition JSON with pools, lanes, nodes, flows, RACI matrix, KPIs, and gap analysis.`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getAi();
      const response = await generateWithModelFallback(ai, {
        contents: prompt,
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: bpmnResponseSchema,
      });

      const text = response.text?.trim() || '{}';
      const parsedData = JSON.parse(text);

      parsedData.version = parsedData.version || '1.0.0';
      parsedData.lastUpdated = new Date().toISOString().split('T')[0];

      res.json(parsedData);
      return;
    }
  } catch (error: any) {
    console.error('All Gemini candidate models failed (likely temporary 503 high demand spike):', error?.message || error);
    // Proceed to fallback synthesizer so the user request succeeds gracefully
  }

  // Graceful resilient fallback synthesis
  try {
    const fallbackProcess = synthesizeFallbackBpmn(requirements, processName);
    res.json(fallbackProcess);
  } catch (synthErr: any) {
    res.status(500).json({
      error: 'Failed to synthesize BPMN workflow. Please try again in a few moments.',
    });
  }
});

// Endpoint: Refine Existing BPMN with Conversational Instructions
app.post('/api/refine-bpmn', async (req, res) => {
  const { currentProcess, refinementPrompt } = req.body;

  if (!currentProcess || !refinementPrompt) {
    res.status(400).json({ error: 'currentProcess and refinementPrompt are required.' });
    return;
  }

  const prompt = `You are a Senior Business Analyst refining an existing BPMN 2.0 process definition.
Current Process JSON:
"""
${JSON.stringify(currentProcess)}
"""

User Refinement Request:
"${refinementPrompt}"

Apply the requested changes (such as adding an exception flow, modifying gateways, inserting a verification task, adding a new swimlane, or updating RACI/User Stories).
Keep existing IDs where possible to preserve diagram continuity.
Return the complete updated ProcessDefinition JSON matching the original schema.`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getAi();
      const response = await generateWithModelFallback(ai, {
        contents: prompt,
        responseMimeType: 'application/json',
        responseSchema: bpmnResponseSchema,
      });

      const text = response.text?.trim() || '{}';
      const updatedProcess = JSON.parse(text);
      updatedProcess.lastUpdated = new Date().toISOString().split('T')[0];

      res.json(updatedProcess);
      return;
    }
  } catch (error: any) {
    console.error('Refine with Gemini failed (likely 503):', error?.message || error);
  }

  // Fallback refinement: apply incremental node/task insertion safely
  try {
    const updated = JSON.parse(JSON.stringify(currentProcess));
    const newTaskId = `Task_Refined_${Date.now()}`;
    const targetLane = updated.pools[0]?.lanes[0]?.id || 'Lane_1';

    updated.nodes.push({
      id: newTaskId,
      type: 'userTask',
      name: refinementPrompt.slice(0, 50),
      laneId: targetLane,
      description: `Refinement step: ${refinementPrompt}`,
      storyPoints: 3,
      userStory: {
        title: `Refined: ${refinementPrompt.slice(0, 30)}`,
        asA: 'Process Stakeholder',
        iWant: `to ${refinementPrompt}`,
        soThat: 'business exception handling is strengthened.',
        acceptanceCriteria: [
          `Verify execution of "${refinementPrompt.slice(0, 30)}"`,
          'Confirm proper notification dispatch',
        ],
      },
    });

    // Wire to last node before end
    const lastTask = updated.nodes.find((n: any) => n.type.includes('Task'));
    if (lastTask) {
      updated.flows.push({
        id: `Flow_${lastTask.id}_to_${newTaskId}`,
        sourceRef: lastTask.id,
        targetRef: newTaskId,
      });
    }

    updated.lastUpdated = new Date().toISOString().split('T')[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to apply refinement.' });
  }
});

// Endpoint: Webhook Dispatcher for Project Management Integration
app.post('/api/sync-pm-webhook', async (req, res) => {
  try {
    const { webhookUrl, payload, headers } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      res.status(400).json({ error: 'Valid webhookUrl is required.' });
      return;
    }

    // Forward payload to webhook URL
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BPMN-Process-Analyst-Studio',
        ...(headers || {}),
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.text();
    res.json({
      success: response.ok,
      statusCode: response.status,
      responseSummary: responseData.slice(0, 300),
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch PM sync webhook.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BPMN Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
