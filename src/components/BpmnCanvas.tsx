import React, { useState, useRef, useEffect } from 'react';
import {
  ProcessDefinition,
  BPMNNode,
  SequenceFlow,
  BPMNElementType,
  Pool,
  Swimlane,
} from '../types/bpmn';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  RotateCcw,
  StepForward,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface BpmnCanvasProps {
  process: ProcessDefinition;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodePosition?: (nodeId: string, x: number, y: number) => void;
}

export const BpmnCanvas: React.FC<BpmnCanvasProps> = ({
  process,
  selectedNodeId,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Simulation mode states
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSimNodeId, setCurrentSimNodeId] = useState<string | null>(null);
  const [simHistory, setSimHistory] = useState<string[]>([]);
  const [gatewayChoices, setGatewayChoices] = useState<SequenceFlow[]>([]);

  const pool = process.pools[0] || {
    id: 'Pool_1',
    name: process.name,
    lanes: [
      { id: 'Lane_1', name: 'Primary Lane', role: 'Business User', order: 0 },
    ],
  };

  const laneHeight = 160;
  const poolStartY = 40;
  const poolStartX = 40;
  const poolHeaderWidth = 46;

  // Calculate bounds
  const minX = Math.min(...process.nodes.map((n) => n.x), 200);
  const maxX = Math.max(...process.nodes.map((n) => n.x + n.width), 1100);
  const canvasWidth = Math.max(maxX + 200, 1350);
  const canvasHeight = Math.max(pool.lanes.length * laneHeight + 120, 600);
  const poolWidth = canvasWidth - poolStartX - 60;
  const poolHeight = pool.lanes.length * laneHeight;

  // Pan event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(Math.max(z + delta, 0.4), 2.2));
    }
  };

  // Reset view to fit
  const handleResetView = () => {
    setZoom(0.9);
    setPan({ x: 30, y: 20 });
  };

  // Simulation step controls
  const handleStartSimulation = () => {
    const startNode = process.nodes.find((n) => n.type.includes('Start') || n.type === 'startEvent');
    if (startNode) {
      setIsSimulating(true);
      setCurrentSimNodeId(startNode.id);
      setSimHistory([startNode.id]);
      onSelectNode(startNode.id);
      checkNextSteps(startNode.id);
    }
  };

  const checkNextSteps = (nodeId: string) => {
    const outgoing = process.flows.filter((f) => f.sourceRef === nodeId);
    const currNode = process.nodes.find((n) => n.id === nodeId);

    if (currNode?.type.includes('Gateway') && outgoing.length > 1) {
      setGatewayChoices(outgoing);
    } else {
      setGatewayChoices([]);
    }
  };

  const handleStepNext = (chosenFlow?: SequenceFlow) => {
    if (!currentSimNodeId) return;

    const outgoing = process.flows.filter((f) => f.sourceRef === currentSimNodeId);
    if (!outgoing.length) {
      // Reached an end event!
      return;
    }

    const flowToFollow = chosenFlow || outgoing[0];
    const nextNode = process.nodes.find((n) => n.id === flowToFollow.targetRef);

    if (nextNode) {
      setCurrentSimNodeId(nextNode.id);
      setSimHistory((prev) => [...prev, nextNode.id]);
      onSelectNode(nextNode.id);
      checkNextSteps(nextNode.id);
    }
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setCurrentSimNodeId(null);
    setSimHistory([]);
    setGatewayChoices([]);
  };

  // Helper to render task icons based on BPMN specification
  const renderTaskMarker = (type: BPMNElementType) => {
    switch (type) {
      case 'userTask':
        // User/Human task marker (mini profile avatar)
        return (
          <g transform="translate(6, 6) scale(0.7)" fill="none" stroke="#64748b" strokeWidth="1.5">
            <circle cx="8" cy="6" r="3.5" />
            <path d="M2.5 15c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" />
          </g>
        );
      case 'serviceTask':
        // Service/Automated task marker (mini gears)
        return (
          <g transform="translate(6, 6) scale(0.65)" fill="none" stroke="#64748b" strokeWidth="1.5">
            <circle cx="9" cy="9" r="3" />
            <path d="M9 1v2.5M9 14.5V17M1 9h2.5M14.5 9H17M3.5 3.5l1.8 1.8M12.7 12.7l1.8 1.8M3.5 14.5l1.8-1.8M12.7 5.3l1.8-1.8" />
          </g>
        );
      case 'businessRuleTask':
        // Business rule table icon
        return (
          <g transform="translate(6, 6) scale(0.7)" fill="none" stroke="#64748b" strokeWidth="1.5">
            <rect x="2" y="2" width="13" height="11" rx="1" />
            <line x1="2" y1="6" x2="15" y2="6" />
            <line x1="7" y1="2" x2="7" y2="13" />
          </g>
        );
      case 'sendTask':
      case 'receiveTask':
        // Envelope marker
        return (
          <g transform="translate(6, 6) scale(0.7)" fill="none" stroke="#64748b" strokeWidth="1.5">
            <rect x="2" y="3" width="13" height="9.5" rx="1" />
            <path d="M2 4l6.5 5L15 4" />
          </g>
        );
      case 'subProcess':
        return (
          <g transform="translate(54, 48) scale(0.8)" fill="none" stroke="#64748b" strokeWidth="1.5">
            <rect x="0" y="0" width="12" height="12" rx="1" />
            <line x1="6" y1="3" x2="6" y2="9" />
            <line x1="3" y1="6" x2="9" y2="6" />
          </g>
        );
      default:
        return null;
    }
  };

  // Helper to render Gateway center symbol
  const renderGatewaySymbol = (type: BPMNElementType) => {
    switch (type) {
      case 'exclusiveGateway':
        // Standard XOR 'X'
        return (
          <path
            d="M 17 17 L 33 33 M 33 17 L 17 33"
            stroke="#b45309"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        );
      case 'parallelGateway':
        // Standard AND '+'
        return (
          <path
            d="M 25 14 L 25 36 M 14 25 L 36 25"
            stroke="#0284c7"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      case 'inclusiveGateway':
        // Standard OR circle
        return (
          <circle
            cx="25"
            cy="25"
            r="10"
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.8"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Floating Canvas Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-lg shadow-lg">
        {/* Zoom In */}
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.2))}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
          title="Zoom In (or Ctrl+Scroll)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fit / Reset */}
        <button
          onClick={handleResetView}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700" />

        {/* Simulation Mode Toggle */}
        {!isSimulating ? (
          <button
            onClick={handleStartSimulation}
            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Flow</span>
          </button>
        ) : (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleStepNext()}
              disabled={gatewayChoices.length > 1}
              className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-medium transition"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step Next</span>
            </button>
            <button
              onClick={handleStopSimulation}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
              title="Stop Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Gateway Decision Choice Overlay during Simulation */}
      {isSimulating && gatewayChoices.length > 1 && (
        <div className="absolute top-16 right-4 z-20 bg-slate-900 border border-amber-500/50 rounded-lg p-3 shadow-xl max-w-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Evaluate Gateway Branch</span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5">
            Select a branch condition to simulate the business path:
          </p>
          <div className="space-y-1.5">
            {gatewayChoices.map((flow) => (
              <button
                key={flow.id}
                onClick={() => handleStepNext(flow)}
                className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800 hover:bg-indigo-950/80 hover:border-indigo-500 border border-slate-700 text-xs text-slate-200 transition flex items-center justify-between"
              >
                <span className="font-medium text-[11px]">{flow.name || 'Default Flow'}</span>
                {flow.conditionExpression && (
                  <span className="text-[10px] text-indigo-400 font-mono ml-2">
                    {flow.conditionExpression.slice(0, 20)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        id="bpmn-canvas-svg"
        width={canvasWidth}
        height={canvasHeight}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
        }}
        className="overflow-visible"
      >
        <defs>
          {/* Arrowhead marker for sequence flows */}
          <marker
            id="bpmn-arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#94a3b8" />
          </marker>

          {/* Active / highlighted arrowhead */}
          <marker
            id="bpmn-arrowhead-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366f1" />
          </marker>

          {/* Exception flow arrowhead */}
          <marker
            id="bpmn-arrowhead-exception"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f43f5e" />
          </marker>

          {/* Soft drop shadows */}
          <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
          </filter>
          <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* --- POOL & SWIMLANES --- */}
        {/* Pool Outer Container */}
        <rect
          x={poolStartX}
          y={poolStartY}
          width={poolWidth}
          height={poolHeight}
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1.5"
          rx="4"
        />

        {/* Pool Vertical Header Bar */}
        <rect
          x={poolStartX}
          y={poolStartY}
          width={poolHeaderWidth}
          height={poolHeight}
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <text
          x={poolStartX + poolHeaderWidth / 2}
          y={poolStartY + poolHeight / 2}
          fill="#e2e8f0"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
          transform={`rotate(-90 ${poolStartX + poolHeaderWidth / 2} ${poolStartY + poolHeight / 2})`}
          className="tracking-wider uppercase"
        >
          {pool.name}
        </text>

        {/* Individual Swimlanes */}
        {pool.lanes.map((lane, idx) => {
          const laneY = poolStartY + idx * laneHeight;
          const isEven = idx % 2 === 0;

          return (
            <g key={lane.id}>
              {/* Lane row background */}
              <rect
                x={poolStartX + poolHeaderWidth}
                y={laneY}
                width={poolWidth - poolHeaderWidth}
                height={laneHeight}
                fill={isEven ? '#090d16' : '#0b1120'}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Lane Vertical Header / Actor Label */}
              <rect
                x={poolStartX + poolHeaderWidth}
                y={laneY}
                width="165"
                height={laneHeight}
                fill="#111827"
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={poolStartX + poolHeaderWidth + 14}
                y={laneY + 28}
                fill="#f1f5f9"
                fontSize="12"
                fontWeight="600"
              >
                {lane.name}
              </text>
              <rect
                x={poolStartX + poolHeaderWidth + 14}
                y={laneY + 38}
                width="125"
                height="20"
                rx="4"
                fill="#1e293b"
                stroke="#334155"
              />
              <text
                x={poolStartX + poolHeaderWidth + 20}
                y={laneY + 52}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="500"
              >
                Role: {lane.role}
              </text>
            </g>
          );
        })}

        {/* --- SEQUENCE FLOWS --- */}
        {process.flows.map((flow) => {
          const sourceNode = process.nodes.find((n) => n.id === flow.sourceRef);
          const targetNode = process.nodes.find((n) => n.id === flow.targetRef);

          if (!sourceNode || !targetNode) return null;

          const isFlowActive =
            isSimulating &&
            simHistory.includes(flow.sourceRef) &&
            (simHistory.includes(flow.targetRef) || currentSimNodeId === flow.targetRef);

          // Build SVG path data from waypoints or simple orthogonal routing
          let pathD = '';
          let midPoint = { x: 0, y: 0 };

          if (flow.waypoints && flow.waypoints.length >= 2) {
            pathD = `M ${flow.waypoints[0].x} ${flow.waypoints[0].y} ` +
              flow.waypoints.slice(1).map((w) => `L ${w.x} ${w.y}`).join(' ');

            const midWp = flow.waypoints[Math.floor(flow.waypoints.length / 2)];
            midPoint = midWp;
          } else {
            const startX = sourceNode.x + sourceNode.width;
            const startY = sourceNode.y + sourceNode.height / 2;
            const endX = targetNode.x;
            const endY = targetNode.y + targetNode.height / 2;

            if (Math.abs(startY - endY) < 15) {
              pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
              midPoint = { x: (startX + endX) / 2, y: startY };
            } else {
              const midX = (startX + endX) / 2;
              pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
              midPoint = { x: midX, y: (startY + endY) / 2 };
            }
          }

          const strokeColor = isFlowActive
            ? '#6366f1'
            : flow.isException
            ? '#f43f5e'
            : '#64748b';

          const markerEnd = isFlowActive
            ? 'url(#bpmn-arrowhead-active)'
            : flow.isException
            ? 'url(#bpmn-arrowhead-exception)'
            : 'url(#bpmn-arrowhead)';

          return (
            <g key={flow.id} className="group">
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isFlowActive ? 2.5 : 1.7}
                strokeDasharray={flow.isException ? '4 3' : 'none'}
                markerEnd={markerEnd}
                className="transition-all duration-300"
              />

              {/* Animated token along path during simulation */}
              {isFlowActive && (
                <circle r="4" fill="#a5b4fc" className="animate-ping">
                  <animateMotion path={pathD} dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Flow label / Condition text */}
              {(flow.name || flow.conditionExpression) && (
                <g transform={`translate(${midPoint.x}, ${midPoint.y - 12})`}>
                  <rect
                    x="-40"
                    y="-10"
                    width="80"
                    height="18"
                    rx="3"
                    fill="#1e293b"
                    stroke={flow.isException ? '#f43f5e' : '#475569'}
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="2"
                    fill={flow.isException ? '#fda4af' : '#e2e8f0'}
                    fontSize="9"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {flow.name || flow.conditionExpression?.slice(0, 16)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* --- BPMN NODES --- */}
        {process.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isCurrentSim = currentSimNodeId === node.id;
          const isSimVisited = simHistory.includes(node.id);

          // Events (Start, End, Intermediate)
          if (node.type.includes('Event')) {
            const isStart = node.type.includes('Start') || node.type === 'startEvent';
            const isEnd = node.type.includes('End') || node.type === 'endEvent';
            const r = node.width / 2;
            const cx = node.x + r;
            const cy = node.y + r;

            let strokeColor = '#3b82f6';
            let strokeWidth = 2;
            let fillColor = '#1e293b';

            if (isStart) {
              strokeColor = '#10b981';
              fillColor = '#064e3b';
            } else if (isEnd) {
              strokeColor = node.type === 'errorEndEvent' ? '#f43f5e' : '#64748b';
              strokeWidth = 3.5;
              fillColor = node.type === 'errorEndEvent' ? '#4c0519' : '#1e293b';
            }

            return (
              <g
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                className="cursor-pointer group"
              >
                {/* Selection halo */}
                {(isSelected || isCurrentSim) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 6}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-spin-slow"
                  />
                )}

                {/* Main Event Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  filter="url(#node-shadow)"
                  className="transition-transform group-hover:scale-105"
                />

                {/* Event specific inner decorations */}
                {node.type === 'terminateEndEvent' && (
                  <circle cx={cx} cy={cy} r={r - 6} fill="#94a3b8" />
                )}
                {node.type === 'messageStartEvent' && (
                  <path
                    d={`M ${cx - 7} ${cy - 5} L ${cx + 7} ${cy - 5} L ${cx + 7} ${cy + 5} L ${cx - 7} ${cy + 5} Z M ${cx - 7} ${cy - 4} L ${cx} ${cy + 1} L ${cx + 7} ${cy - 4}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.2"
                  />
                )}
                {node.type === 'errorEndEvent' && (
                  <path
                    d={`M ${cx - 3} ${cy - 8} L ${cx + 5} ${cy - 1} L ${cx} ${cy} L ${cx + 3} ${cy + 8} L ${cx - 5} ${cy + 1} L ${cx} ${cy} Z`}
                    fill="#f43f5e"
                  />
                )}

                {/* Event Label */}
                <text
                  x={cx}
                  y={cy + r + 14}
                  fill="#cbd5e1"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                  className="select-none"
                >
                  {node.name}
                </text>
              </g>
            );
          }

          // Gateways (Exclusive, Parallel, Inclusive)
          if (node.type.includes('Gateway')) {
            const cx = node.x + node.width / 2;
            const cy = node.y + node.height / 2;
            const half = node.width / 2;

            // Diamond path
            const diamondD = `M ${cx} ${cy - half} L ${cx + half} ${cy} L ${cx} ${cy + half} L ${cx - half} ${cy} Z`;

            return (
              <g
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                className="cursor-pointer group"
              >
                {(isSelected || isCurrentSim) && (
                  <path
                    d={`M ${cx} ${cy - half - 5} L ${cx + half + 5} ${cy} L ${cx} ${cy + half + 5} L ${cx - half - 5} ${cy} Z`}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                )}

                <path
                  d={diamondD}
                  fill="#1e293b"
                  stroke="#eab308"
                  strokeWidth="2.2"
                  filter="url(#node-shadow)"
                  className="transition-transform group-hover:scale-105"
                />

                {/* Gateway symbol in center */}
                <g transform={`translate(${node.x}, ${node.y})`}>
                  {renderGatewaySymbol(node.type)}
                </g>

                {/* Gateway Name Label */}
                <text
                  x={cx}
                  y={cy + half + 14}
                  fill="#e2e8f0"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {node.name}
                </text>
              </g>
            );
          }

          // Tasks & Sub-processes
          return (
            <g
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              className="cursor-pointer group"
            >
              {/* Highlight Aura */}
              {(isSelected || isCurrentSim) && (
                <rect
                  x={node.x - 4}
                  y={node.y - 4}
                  width={node.width + 8}
                  height={node.height + 8}
                  rx="9"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeDasharray={isCurrentSim ? '5 2' : 'none'}
                />
              )}

              {/* Task Body */}
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="6"
                fill={isCurrentSim ? '#312e81' : isSimVisited ? '#1e1e38' : '#1e293b'}
                stroke={
                  isSelected
                    ? '#6366f1'
                    : isCurrentSim
                    ? '#818cf8'
                    : node.type === 'serviceTask'
                    ? '#0284c7'
                    : '#475569'
                }
                strokeWidth={isSelected || isCurrentSim ? 2 : 1.3}
                filter="url(#node-shadow)"
                className="transition-colors group-hover:stroke-indigo-400"
              />

              {/* Standard Task Type Marker */}
              <g transform={`translate(${node.x}, ${node.y})`}>
                {renderTaskMarker(node.type)}
              </g>

              {/* Story Points pill if present */}
              {node.storyPoints && (
                <g transform={`translate(${node.x + node.width - 20}, ${node.y + 6})`}>
                  <rect width="14" height="13" rx="3" fill="#334155" />
                  <text x="7" y="10" fill="#94a3b8" fontSize="8" fontWeight="600" textAnchor="middle">
                    {node.storyPoints}
                  </text>
                </g>
              )}

              {/* Task Name wrapped nicely */}
              <foreignObject
                x={node.x + 10}
                y={node.y + 12}
                width={node.width - 20}
                height={node.height - 18}
                className="pointer-events-none"
              >
                <div className="h-full flex items-center justify-center text-center px-1">
                  <span className="text-[11px] font-medium text-slate-100 leading-tight line-clamp-2">
                    {node.name}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Bottom Canvas Notation Legend */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center space-x-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 shadow-md">
        <span className="font-semibold text-slate-300">BPMN 2.0 Legend:</span>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full border border-emerald-500 bg-emerald-950 inline-block" />
          <span>Start</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3.5 h-2.5 rounded border border-slate-500 bg-slate-800 inline-block" />
          <span>User Task</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3.5 h-2.5 rounded border border-sky-500 bg-sky-950 inline-block" />
          <span>Service Task</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rotate-45 border border-yellow-500 bg-slate-800 inline-block" />
          <span>Gateway (XOR/AND)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-950 inline-block" />
          <span>End Event</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-500">
          <span>Scroll to Pan • Ctrl+Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
