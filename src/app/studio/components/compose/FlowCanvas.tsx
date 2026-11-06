import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Flag, Inbox, Plus, SearchX, Sparkles, type LucideIcon } from 'lucide-react'
import type { SolutionOption, StepActor } from '@/app/blueprint/types'
import { needOf } from '@/app/services/mock/capability-analysis-service'
import { StatusBadge } from '@/components/os/StatusBadge'
import { cn } from '@/lib/utils'
import { actorMeta } from '../actor-meta'
import type { CapabilityMapping } from '../../types'
import { kindIcon, mappingStatusMeta } from './flow-meta'

const NODE_W = 212
const COL = NODE_W + 40
const ROW = 178
const ATTACH_Y = 78
const SHARED_ROW = 66

type TerminalData = { icon: LucideIcon; title: string; subtitle: string }
type StepData = { name: string; actor: StepActor; index: number; subtitle: string; selected: boolean; mappingId: string | null }
type ResourceData = { mapping: CapabilityMapping; selected: boolean; composing: boolean; mappingId: string }
type LaneData = { title: string; width: number; height: number }

function ports() {
  return (
    <>
      <Handle id="in-l" type="target" position={Position.Left} />
      <Handle id="in-r" type="target" position={Position.Right} />
      <Handle id="out-l" type="source" position={Position.Left} />
      <Handle id="out-r" type="source" position={Position.Right} />
    </>
  )
}

function TerminalNode({ data }: NodeProps<Node<TerminalData>>) {
  const Icon = data.icon
  return (
    <div style={{ width: NODE_W }} className="flex items-center gap-2.5 rounded-[18px] bg-studio-ink p-2.5 text-white shadow-studio">
      {ports()}
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-tight font-semibold">{data.title}</span>
        <span className="block truncate text-[11px] text-white/70">{data.subtitle}</span>
      </span>
    </div>
  )
}

function StepNode({ data }: NodeProps<Node<StepData>>) {
  const meta = actorMeta[data.actor]
  const Icon = meta.icon
  return (
    <div style={{ width: NODE_W }} className={cn('flex cursor-pointer items-center gap-2.5 rounded-[18px] border bg-white p-2.5 shadow-studio', meta.ring, data.selected && 'ring-2 ring-primary')}>
      {ports()}
      <Handle id="att" type="source" position={Position.Bottom} />
      <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', meta.tile)}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-tight font-semibold">{data.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{data.subtitle}</span>
      </span>
      <span className="self-start text-[10px] font-semibold text-muted-foreground tabular-nums">{data.index + 1}</span>
    </div>
  )
}

function ResourceNode({ data }: NodeProps<Node<ResourceData>>) {
  const { mapping, selected, composing } = data
  const r = mapping.resource
  const status = mapping.status
  const Icon = composing ? Sparkles : r ? kindIcon[r.kind] : SearchX
  return (
    <div
      style={{ width: NODE_W }}
      className={cn(
        'relative cursor-pointer rounded-[16px] border p-2 shadow-studio',
        status === 'selected' && 'border-success/40 bg-white',
        status === 'available' && 'border-dashed border-actor-ai/50 bg-white/80',
        status === 'requires-configuration' && 'border-warning bg-warning-soft/70',
        status === 'missing' && 'border-dashed border-danger bg-danger-soft/70',
        selected && 'ring-2 ring-primary',
      )}
    >
      <Handle id="att" type="target" position={Position.Top} />
      {(status === 'missing' || composing) && <span aria-hidden className="studio-pulse absolute inset-0 -z-10 rounded-[16px] bg-danger/15" />}
      <span className="flex items-center gap-2">
        <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-[9px]', status === 'missing' ? 'bg-danger text-white' : status === 'selected' ? 'bg-studio-ink text-white' : 'bg-accent text-accent-foreground')}>
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs leading-tight font-semibold">{r?.name ?? mapping.need}</span>
          <span className="mt-0.5 block">
            <StatusBadge tone={composing ? 'info' : mappingStatusMeta[status].tone}>{composing ? 'Composing…' : mappingStatusMeta[status].label}</StatusBadge>
          </span>
        </span>
        {status === 'available' && <Plus aria-hidden className="size-3.5 shrink-0 text-actor-ai" />}
      </span>
    </div>
  )
}

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  return (
    <div style={{ width: data.width, height: data.height }} className="pointer-events-none rounded-[24px] border border-dashed border-studio-ink/15 bg-white/25 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
      {data.title}
    </div>
  )
}

const nodeTypes = { terminal: TerminalNode, step: StepNode, resource: ResourceNode, lane: LaneNode }

export interface FlowInsets {
  left: number
  right: number
  top: number
  bottom: number
}

function buildGraph(option: SolutionOption, mappings: CapabilityMapping[], cols: number, selectedId: string | null, composing: string | null, roleLabel: (id: string) => string, inputs: number, outputs: number) {
  const mappingOf = (capabilityId: string) => mappings.find((m) => m.capabilityId === capabilityId)
  const place = (i: number) => {
    const row = Math.floor(i / cols)
    const c = i % cols
    return { row, col: row % 2 ? cols - 1 - c : c }
  }
  const nodes: Node[] = []
  const edges: Edge[] = []
  const seq = ['start', ...option.steps.map((s) => s.id), 'end']

  seq.forEach((id, i) => {
    const { row, col } = place(i)
    const position = { x: col * COL, y: row * ROW }
    if (id === 'start') {
      nodes.push({ id, type: 'terminal', position, data: { icon: Inbox, title: 'New case arrives', subtitle: `${inputs} ${inputs === 1 ? 'input' : 'inputs'}` }, selectable: false, ariaLabel: 'Workflow start' })
    } else if (id === 'end') {
      nodes.push({ id, type: 'terminal', position, data: { icon: Flag, title: 'Case resolved', subtitle: `${outputs} ${outputs === 1 ? 'output' : 'outputs'}` }, selectable: false, ariaLabel: 'Workflow end' })
    } else {
      const step = option.steps[i - 1]
      const mapping = mappingOf(needOf(step))
      const subtitle = step.actor === 'human' ? (step.role ? roleLabel(step.role) : 'Approver to be decided') : actorMeta[step.actor].label
      const selected = !!mapping && mapping.id === selectedId
      nodes.push({ id, type: 'step', position, data: { name: step.name, actor: step.actor, index: i - 1, subtitle, selected, mappingId: mapping?.id ?? null }, ariaLabel: `Step ${i}: ${step.name}` })
      if (mapping) {
        nodes.push({
          id: `res-${id}`,
          type: 'resource',
          position: { x: position.x, y: position.y + ATTACH_Y },
          data: { mapping, selected, composing: composing === mapping.capabilityId, mappingId: mapping.id },
          ariaLabel: `${mapping.need}: ${mappingStatusMeta[mapping.status].label}`,
        })
        const color = mappingStatusMeta[mapping.status].color
        edges.push({ id: `att-${id}`, source: id, sourceHandle: 'att', target: `res-${id}`, targetHandle: 'att', type: 'straight', style: { stroke: color, strokeDasharray: '3 4' }, selectable: false, focusable: false })
      }
    }
    if (i > 0) {
      const prev = place(i - 1)
      const live = id === 'end' ? true : (mappingOf(needOf(option.steps[i - 1]))?.status === 'selected')
      const sameRow = prev.row === place(i).row
      let sourceHandle: string
      let targetHandle: string
      if (sameRow) {
        const rightward = prev.row % 2 === 0
        sourceHandle = rightward ? 'out-r' : 'out-l'
        targetHandle = rightward ? 'in-l' : 'in-r'
      } else {
        const atRight = prev.row % 2 === 0
        sourceHandle = atRight ? 'out-r' : 'out-l'
        targetHandle = atRight ? 'in-r' : 'in-l'
      }
      edges.push({
        id: `${seq[i - 1]}-${id}`,
        source: seq[i - 1],
        target: id,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: live,
        selectable: false,
        focusable: false,
        style: live ? { stroke: 'var(--actor-ai)' } : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: live ? 'var(--actor-ai)' : undefined },
      })
    }
  })

  // Needs that serve the whole application rather than a single step.
  const shared = mappings.filter((m) => m.stepIds.length === 0)
  if (shared.length) {
    const rows = Math.floor((seq.length - 1) / cols) + 1
    const y = rows * ROW - 12
    const perRow = Math.max(1, cols)
    const laneRows = Math.ceil(shared.length / perRow)
    nodes.push({
      id: 'shared-lane',
      type: 'lane',
      position: { x: -14, y },
      data: { title: 'Shared by every step', width: Math.min(shared.length, perRow) * COL - 12, height: laneRows * SHARED_ROW + 34 },
      selectable: false,
      draggable: false,
      focusable: false,
      zIndex: -1,
    })
    shared.forEach((mapping, i) => {
      nodes.push({
        id: `res-${mapping.id}`,
        type: 'resource',
        position: { x: (i % perRow) * COL, y: y + 26 + Math.floor(i / perRow) * SHARED_ROW },
        data: { mapping, selected: mapping.id === selectedId, composing: composing === mapping.capabilityId, mappingId: mapping.id },
        ariaLabel: `${mapping.need}: ${mappingStatusMeta[mapping.status].label}`,
      })
    })
  }
  return { nodes, edges }
}

/** The column count that lets the whole flow fit at the largest zoom. */
function bestColumns(items: number, shared: number, availableW: number, availableH: number) {
  let best = 2
  let bestZoom = 0
  for (let cols = 2; cols <= 7; cols++) {
    const rows = Math.ceil(items / cols)
    const h = rows * ROW + (shared ? Math.ceil(shared / cols) * SHARED_ROW + 34 : 0)
    const zoom = Math.min(availableW / (cols * COL), availableH / h, 1)
    if (zoom > bestZoom + 0.001) {
      best = cols
      bestZoom = zoom
    }
  }
  return best
}

function Refit({ signature, insets }: { signature: string; insets: FlowInsets }) {
  const { fitView } = useReactFlow()
  const initialized = useNodesInitialized()
  const { left, right, top, bottom } = insets
  useEffect(() => {
    if (!initialized) return
    const id = requestAnimationFrame(() => fitView({ minZoom: 0.6, maxZoom: 1, duration: 250, padding: { left: `${left}px`, right: `${right}px`, top: `${top}px`, bottom: `${bottom}px` } }))
    return () => cancelAnimationFrame(id)
  }, [initialized, signature, fitView, left, right, top, bottom])
  return null
}

function Canvas({
  option,
  mappings,
  selectedId,
  composing,
  onSelect,
  roleLabel,
  inputs,
  outputs,
  insets,
  width,
  height,
}: {
  option: SolutionOption
  mappings: CapabilityMapping[]
  selectedId: string | null
  composing: string | null
  onSelect: (id: string | null) => void
  roleLabel: (id: string) => string
  inputs: number
  outputs: number
  insets: FlowInsets
  width: number
  height: number
}) {
  const cols = bestColumns(option.steps.length + 2, mappings.filter((m) => m.stepIds.length === 0).length, width - insets.left - insets.right, height - insets.top - insets.bottom)
  const graph = useMemo(() => buildGraph(option, mappings, cols, selectedId, composing, roleLabel, inputs, outputs), [option, mappings, cols, selectedId, composing, roleLabel, inputs, outputs])
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const layoutKey = `${option.id}-${cols}`

  // Keep anything the user dragged; a layout change (approach or column count) resets positions.
  useEffect(() => {
    setNodes((prev) => {
      const sameLayout = prev.length > 0 && prev[0].data?.layoutKey === layoutKey
      return graph.nodes.map((n) => {
        const before = prev.find((p) => p.id === n.id)
        return { ...n, measured: before?.measured, position: (sameLayout ? before?.position : undefined) ?? n.position, data: { ...n.data, layoutKey } }
      })
    })
  }, [graph.nodes, layoutKey, setNodes])

  const onSelectionChange = useCallback(
    ({ nodes: picked }: OnSelectionChangeParams) => {
      const id = picked[0]?.data?.mappingId as string | undefined
      if (id) onSelect(id)
    },
    [onSelect],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={(_, node) => {
        const id = node.data?.mappingId as string | undefined
        if (id) onSelect(id)
      }}
      onSelectionChange={onSelectionChange}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ minZoom: 0.6, maxZoom: 1, padding: { left: `${insets.left}px`, right: `${insets.right}px`, top: `${insets.top}px`, bottom: `${insets.bottom}px` } }}
      minZoom={0.25}
      maxZoom={1.6}
      nodesConnectable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      aria-label="Application flow"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="oklch(0.5 0.03 285 / 0.22)" />
      <Controls position="bottom-left" showInteractive={false} style={{ marginLeft: insets.left - 8 }} />
      <Refit signature={layoutKey} insets={insets} />
    </ReactFlow>
  )
}

/** The application as a workflow: steps in order, each with the resource that performs it. */
export function FlowCanvas(props: Parameters<typeof Canvas>[0]) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}
