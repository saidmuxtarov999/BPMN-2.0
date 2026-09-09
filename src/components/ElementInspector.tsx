import React, { useState, useEffect } from 'react';
import {
  BPMNNode,
  ProcessDefinition,
  BPMNElementType,
  Swimlane,
} from '../types/bpmn';
import {
  X,
  Edit3,
  User,
  Cpu,
  Layers,
  CheckSquare,
  AlertCircle,
  FileCheck,
  Trash2,
} from 'lucide-react';

interface ElementInspectorProps {
  nodeId: string | null;
  process: ProcessDefinition;
  onUpdateNode: (updatedNode: BPMNNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  nodeId,
  process,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  const node = process.nodes.find((n) => n.id === nodeId);
  const [formData, setFormData] = useState<BPMNNode | null>(null);

  useEffect(() => {
    if (node) {
      setFormData({ ...node });
    } else {
      setFormData(null);
    }
  }, [node]);

  if (!node || !formData) {
    return null;
  }

  const pool = process.pools[0];
  const currentLane = pool?.lanes.find((l) => l.id === node.laneId);

  const handleFieldChange = (field: keyof BPMNNode, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateNode(updated);
  };

  const handleStoryChange = (subField: string, value: any) => {
    const updatedStory = {
      title: formData.userStory?.title || formData.name,
      asA: formData.userStory?.asA || '',
      iWant: formData.userStory?.iWant || '',
      soThat: formData.userStory?.soThat || '',
      acceptanceCriteria: formData.userStory?.acceptanceCriteria || [],
      [subField]: value,
    };
    handleFieldChange('userStory', updatedStory);
  };

  const raciItemsForTask = process.raciMatrix.filter((r) => r.taskId === node.id);

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 h-full flex flex-col z-20 text-slate-200 select-none shadow-2xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Element Inspector
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {node.id}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Name input */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Element Label / Activity
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* BPMN Element Type */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              BPMN Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleFieldChange('type', e.target.value as BPMNElementType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <optgroup label="Events">
                <option value="startEvent">Start Event</option>
                <option value="messageStartEvent">Message Start</option>
                <option value="timerEvent">Timer Event</option>
                <option value="endEvent">End Event</option>
                <option value="errorEndEvent">Error End</option>
                <option value="terminateEndEvent">Terminate End</option>
              </optgroup>
              <optgroup label="Tasks">
                <option value="userTask">User Task (Human)</option>
                <option value="serviceTask">Service Task (Automated)</option>
                <option value="businessRuleTask">Business Rule Task</option>
                <option value="sendTask">Send Task</option>
                <option value="receiveTask">Receive Task</option>
                <option value="manualTask">Manual Task</option>
                <option value="subProcess">Sub-Process</option>
              </optgroup>
              <optgroup label="Gateways">
                <option value="exclusiveGateway">Exclusive (XOR)</option>
                <option value="parallelGateway">Parallel (AND)</option>
                <option value="inclusiveGateway">Inclusive (OR)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Swimlane / Actor
            </label>
            <select
              value={formData.laneId}
              onChange={(e) => handleFieldChange('laneId', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              {pool?.lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Business Logic / Description */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Functional Description & Business Logic
          </label>
          <textarea
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Document inputs, operational guidelines, or escalation conditions..."
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* System Component / Role */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Role Assignee
            </label>
            <input
              type="text"
              value={formData.assigneeRole || currentLane?.role || ''}
              onChange={(e) => handleFieldChange('assigneeRole', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Story Points
            </label>
            <input
              type="number"
              min="1"
              max="21"
              value={formData.storyPoints || 3}
              onChange={(e) => handleFieldChange('storyPoints', parseInt(e.target.value) || 1)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* User Story Specification Section */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Dev User Story & Acceptance Criteria</span>
          </div>

          <div className="space-y-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Story Template</span>
              <div className="mt-1 space-y-1 text-slate-300">
                <div className="flex items-center space-x-1">
                  <span className="text-indigo-400 font-medium w-10">As a:</span>
                  <input
                    type="text"
                    value={formData.userStory?.asA || ''}
                    onChange={(e) => handleStoryChange('asA', e.target.value)}
                    placeholder="e.g. Compliance Officer"
                    className="flex-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-indigo-400 font-medium w-10">I want:</span>
                  <input
                    type="text"
                    value={formData.userStory?.iWant || ''}
                    onChange={(e) => handleStoryChange('iWant', e.target.value)}
                    placeholder="e.g. to inspect suspicious matches"
                    className="flex-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-indigo-400 font-medium w-10">So that:</span>
                  <input
                    type="text"
                    value={formData.userStory?.soThat || ''}
                    onChange={(e) => handleStoryChange('soThat', e.target.value)}
                    placeholder="e.g. we prevent fraudulent accounts"
                    className="flex-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Acceptance Criteria (Gherkin format)
              </span>
              <div className="mt-1 space-y-1">
                {(formData.userStory?.acceptanceCriteria || []).map((ac, idx) => (
                  <div key={idx} className="flex items-center space-x-1 text-[11px] text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="line-clamp-2">{ac}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RACI Assignment */}
        {raciItemsForTask.length > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 mb-1 block">RACI Matrix Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {raciItemsForTask.map((r, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800"
                >
                  {r.role}: [{r.code}]
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Delete Element */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => onDeleteNode(node.id)}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Element</span>
          </button>
        </div>
      </div>
    </div>
  );
};
