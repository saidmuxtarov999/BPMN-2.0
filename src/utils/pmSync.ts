import { ProcessDefinition, PMSyncItem, PMPlatform, PMSyncConfig } from '../types/bpmn';

export function extractSyncItemsFromProcess(process: ProcessDefinition): PMSyncItem[] {
  const items: PMSyncItem[] = [];

  for (const node of process.nodes) {
    // Only sync actionable tasks and sub-processes
    if (
      node.type === 'userTask' ||
      node.type === 'serviceTask' ||
      node.type === 'businessRuleTask' ||
      node.type === 'manualTask' ||
      node.type === 'scriptTask' ||
      node.type === 'task' ||
      node.type === 'subProcess'
    ) {
      const acceptanceCriteria = node.userStory?.acceptanceCriteria || [
        `Given the process reaches "${node.name}", ensure execution requirements are met.`,
        `Given input data dependencies, verify output values are logged.`,
      ];

      items.push({
        id: `pm_${node.id}`,
        nodeId: node.id,
        title: node.userStory?.title || `${node.name} (${node.assigneeRole || 'System'})`,
        type: node.type === 'userTask' ? 'User Story' : 'Technical Task',
        description:
          node.userStory?.asA
            ? `As a ${node.userStory.asA}, I want ${node.userStory.iWant} so that ${node.userStory.soThat}.\n\nContext:\n${node.description || 'Process activity defined in BPMN model.'}`
            : (node.description || `Execute BPMN Activity: ${node.name}`),
        acceptanceCriteria,
        assigneeRole: node.assigneeRole || 'Unassigned',
        storyPoints: node.storyPoints || (node.type === 'userTask' ? 3 : 2),
        status: node.syncStatus === 'synced' ? 'Synced' : 'Draft',
        externalKey: node.syncId,
      });
    }
  }

  // Also include high-severity Gap Analysis items as Tech Debt / Spike issues!
  if (process.gapAnalysis && process.gapAnalysis.length > 0) {
    for (const gap of process.gapAnalysis) {
      items.push({
        id: `pm_gap_${gap.id}`,
        nodeId: gap.id,
        title: `[Process Gap - ${gap.category}] ${gap.description.slice(0, 50)}...`,
        type: 'Defect / Improvement',
        description: `Identified Gap: ${gap.description}\n\nSeverity: ${gap.severity}\n\nBA Recommendation:\n${gap.recommendation}`,
        acceptanceCriteria: [
          `Validate mitigation strategy for identified ${gap.category} risk.`,
          `Update process documentation once remediation is deployed.`,
        ],
        assigneeRole: 'Lead Architect / BA',
        storyPoints: gap.severity === 'High' ? 5 : 3,
        status: 'Draft',
      });
    }
  }

  return items;
}

export function generateJiraCsv(items: PMSyncItem[], projectKey: string = 'BPMN'): string {
  const headers = [
    'Issue Type',
    'Issue key',
    'Summary',
    'Description',
    'Story Points',
    'Component',
    'Acceptance Criteria',
  ];

  const rows = items.map((item, index) => {
    const issueKey = `${projectKey}-${index + 101}`;
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const acFormatted = item.acceptanceCriteria.map((ac, i) => `* AC ${i + 1}: ${ac}`).join('\n');

    return [
      escapeCsv(item.type === 'User Story' ? 'Story' : 'Task'),
      escapeCsv(issueKey),
      escapeCsv(item.title),
      escapeCsv(item.description),
      item.storyPoints.toString(),
      escapeCsv(item.assigneeRole),
      escapeCsv(acFormatted),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateAzureDevOpsCsv(items: PMSyncItem[], areaPath: string = 'Workflows'): string {
  const headers = [
    'Work Item Type',
    'Title',
    'Description',
    'Acceptance Criteria',
    'Story Points',
    'Area Path',
    'Assigned To',
  ];

  const rows = items.map((item) => {
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const acFormatted = item.acceptanceCriteria.map((ac) => `<li>${ac}</li>`).join('');

    return [
      escapeCsv(item.type === 'User Story' ? 'User Story' : 'Task'),
      escapeCsv(item.title),
      escapeCsv(item.description),
      escapeCsv(`<ul>${acFormatted}</ul>`),
      item.storyPoints.toString(),
      escapeCsv(areaPath),
      escapeCsv(item.assigneeRole),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function formatPlatformPayload(platform: PMPlatform, items: PMSyncItem[], config: PMSyncConfig) {
  switch (platform) {
    case 'jira':
      return {
        project: { key: config.projectKey },
        syncCount: items.length,
        issues: items.map((it, idx) => ({
          fields: {
            project: { key: config.projectKey },
            summary: it.title,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: it.description }],
                },
              ],
            },
            issuetype: { name: it.type === 'User Story' ? 'Story' : 'Task' },
            customfield_10016: it.storyPoints,
            labels: ['bpmn-generated', it.assigneeRole.toLowerCase().replace(/\s+/g, '-')],
          },
        })),
      };

    case 'linear':
      return {
        teamKey: config.projectKey,
        syncCount: items.length,
        issues: items.map((it) => ({
          title: it.title,
          description: `${it.description}\n\n### Acceptance Criteria\n${it.acceptanceCriteria.map((a) => `- [ ] ${a}`).join('\n')}`,
          estimate: it.storyPoints,
          labels: ['Process-Workflow', it.assigneeRole],
        })),
      };

    case 'azure_devops':
      return {
        areaPath: config.projectKey,
        syncCount: items.length,
        workItems: items.map((it) => ({
          op: 'add',
          path: '/fields/System.Title',
          value: it.title,
          criteria: it.acceptanceCriteria,
          type: it.type,
        })),
      };

    case 'github':
      return {
        repo: config.projectKey,
        syncCount: items.length,
        issues: items.map((it) => ({
          title: it.title,
          body: `## Description\n${it.description}\n\n## Acceptance Criteria\n${it.acceptanceCriteria.map((a) => `- [ ] ${a}`).join('\n')}\n\n*Role:* ${it.assigneeRole}`,
          labels: ['bpmn-workflow', it.type.toLowerCase().replace(/\s+/g, '-')],
        })),
      };

    default:
      return {
        platform,
        project: config.projectKey,
        items,
      };
  }
}
