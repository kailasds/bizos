import { useEffect, useMemo, useRef, useState } from 'react'
import { Background, BackgroundVariant, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useNodesInitialized, useNodesState, useReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle } from 'lucide-react'
import type { FlowStep, StepActor } from '@/app/blueprint/types'
import type { StepInsight } from '@/app/services/mock/architecture-service'
import { cn } from '@/lib/utils'
import { actorMeta } from './actor-meta'

const NODE_W = 132
const LANE_H = 96

const laneOrder: StepActor[] = ['human', 'automated', 'system']

type StepData = { step: FlowStep; index: number; subtitle: string; warning: boolean; selected: boolean; onSelect?: (id: string) => void }
type LaneData = { actor: StepActor; count: number; width: number }

function StepNode({ data }: NodeProps<Node<StepData>>) {
  const meta = actorMeta[data.step.actor]
  const Icon = meta.icon
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" id="top" position={Position.Top} />
      <Handle type="source" id="bottom" position={Position.Bottom} />
      <Handle type="target" id="bottom-in" position={Position.Bottom} />
      <Handle type="source" id="top-out" position={Position.Top} />
      <button
        type="button"
        aria-pressed={data.selected}
        aria-label={`Step ${data.index + 1}: ${data.step.name}`}
        disabled={!data.onSelect}
        onClick={() => data.onSelect?.(data.step.id)}
        style={{ width: NODE_W }}
        className={cn('nodrag nopan pointer-events-auto flex min-h-14 items-start gap-1.5 rounded-[14px] border bg-white p-1.5 text-left shadow-studio outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default', meta.ring, data.selected && 'ring-2 ring-primary')}
      >
        <span aria-hidden className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg', meta.tile)}>
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] leading-tight font-semibold">{data.step.name}</span>
          <span className={cn('mt-0.5 flex items-center gap-1 text-[10px] leading-tight', data.warning ? 'font-medium text-warning-ink' : 'text-muted-foreground')}>
            {data.warning && <AlertTriangle aria-hidden className="size-2.5 shrink-0" />}
            <span className="truncate">{data.subtitle}</span>
          </span>
        </span>
      </button>
    </>
  )
}

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  const meta = actorMeta[data.actor]
  const Icon = meta.icon
  return (
    <div style={{ width: data.width, height: LANE_H - 6 }} className={cn('pointer-events-none rounded-[20px]', meta.lane)}>
      <span className="flex items-center gap-1.5 px-3 pt-1.5 text-[10px] font-semibold text-muted-foreground">
        <Icon aria-hidden className="size-3" />
        {meta.label}
        <span className="tabular-nums">{data.count}</span>
      </span>
    </div>
  )
}

const nodeTypes = { step: StepNode, lane: LaneNode }

function Refit({ signature }: { signature: string }) {
  const { fitView } = useReactFlow()
  const initialized = useNodesInitialized()
  const host = useRef<number | null>(null)
  useEffect(() => {
    if (!initialized) return
    if (host.current) cancelAnimationFrame(host.current)
    host.current = requestAnimationFrame(() => fitView({ padding: 0.04, maxZoom: 1, duration: 200 }))
  }, [initialized, signature, fitView])
  return null
}

/** Swimlanes on a canvas: the operating model at a glance — who does what, in what order. */
export function ApproachFlow({
  steps,
  insights,
  roleLabel,
  selectedStepId,
  onSelectStep,
  label,
}: {
  steps: FlowStep[]
  insights?: StepInsight[]
  roleLabel: (roleId: string) => string
  selectedStepId?: string | null
  onSelectStep?: (stepId: string) => void
  label: string
}) {
  const graph = useMemo(() => {
    // Only lanes with work in them; an empty lane says nothing.
    const usedLanes = laneOrder.filter((a) => steps.some((s) => s.actor === a))
    const y = (a: StepActor) => usedLanes.indexOf(a) * LANE_H
    // Steps in different lanes may overlap in x, which keeps long flows legible when fitted.
    const positions = steps.reduce<number[]>((xs, s, i) => [...xs, i === 0 ? 28 : xs[i - 1] + (steps[i - 1].actor === s.actor ? NODE_W + 18 : Math.round(NODE_W * 0.7))], [])
    const width = (positions.at(-1) ?? 0) + NODE_W + 28
    const lanes: Node[] = usedLanes.map((actor) => ({
      id: `lane-${actor}`,
      type: 'lane',
      position: { x: 0, y: y(actor) },
      data: { actor, count: steps.filter((s) => s.actor === actor).length, width },
      selectable: false,
      draggable: false,
      focusable: false,
      zIndex: 0,
    }))
    const stepNodes: Node[] = steps.map((step, index) => {
      const insight = insights?.find((n) => n.step.id === step.id)
      const subtitle =
        step.actor === 'human'
          ? step.role
            ? roleLabel(step.role)
            : 'Approver to be decided'
          : insight?.missing
            ? 'New worker needed'
            : (insight?.resource?.name ?? actorMeta[step.actor].label)
      return {
        id: step.id,
        type: 'step',
        position: { x: positions[index], y: y(step.actor) + 22 },
        data: { step, index, subtitle, warning: step.actor === 'human' ? !step.role : Boolean(insight?.missing), selected: selectedStepId === step.id, onSelect: onSelectStep },
        zIndex: 2,
        focusable: false,
      }
    })
    const links: Edge[] = steps.slice(1).map((s, i) => {
      const prev = steps[i]
      const up = laneOrder.indexOf(s.actor) < laneOrder.indexOf(prev.actor)
      const down = laneOrder.indexOf(s.actor) > laneOrder.indexOf(prev.actor)
      return {
        id: `${prev.id}-${s.id}`,
        source: prev.id,
        target: s.id,
        type: 'smoothstep',
        animated: true,
        zIndex: 1,
        sourceHandle: down ? 'bottom' : up ? 'top-out' : undefined,
        targetHandle: down ? 'top' : up ? 'bottom-in' : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      }
    })
    return { nodes: [...lanes, ...stepNodes], edges: links, laneCount: usedLanes.length }
  }, [steps, insights, roleLabel, selectedStepId, onSelectStep])

  // Rebuilt nodes must keep their measured size, or React Flow hides them until it measures again.
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  useEffect(() => {
    setNodes((prev) => graph.nodes.map((n) => ({ ...n, measured: prev.find((p) => p.id === n.id)?.measured })))
  }, [graph.nodes, setNodes])

  // Refit when the window (and so the canvas) changes size, not just when the steps do.
  const figureRef = useRef<HTMLElement>(null)
  const [figureWidth, setFigureWidth] = useState(0)
  useEffect(() => {
    if (!figureRef.current) return
    const ro = new ResizeObserver(([entry]) => setFigureWidth(Math.round(entry.contentRect.width)))
    ro.observe(figureRef.current)
    return () => ro.disconnect()
  }, [])
  const signature = `${steps.map((s) => s.id).join('|')}@${figureWidth}`

  return (
    <figure ref={figureRef} aria-label={label} style={{ height: graph.laneCount * LANE_H + 28 }} className="studio-card overflow-hidden rounded-[24px] p-1">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
          fitViewOptions={{ padding: 0.04, maxZoom: 1 }}
          minZoom={0.3}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          preventScrolling={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="oklch(0.5 0.03 285 / 0.18)" />
          <Refit signature={signature} />
        </ReactFlow>
      </ReactFlowProvider>
    </figure>
  )
}
