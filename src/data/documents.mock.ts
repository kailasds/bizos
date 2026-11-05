/** Mock documents for the Document AI application. Fabricated content. */

export type ExtractionStatus = 'extracted' | 'needs-review' | 'processing' | 'failed'

export interface ExtractedField {
  key: string
  label: string
  value: string
  /** 0–1, mock model confidence. */
  confidence: number
  /** Line index in the preview the value was read from. */
  sourceLine: number
}

export interface MockDocument {
  id: string
  name: string
  docType: string
  source: string
  receivedAt: string
  pages: number
  status: ExtractionStatus
  linkedTo?: string
  /** Lines rendered in the mock page preview. */
  lines: string[]
  fields: ExtractedField[]
  issue?: string
}

export const documents: MockDocument[] = [
  {
    id: 'DOC-7781',
    name: 'Repair estimate — Northside Autos.pdf',
    docType: 'Repair estimate',
    source: 'Claims portal upload',
    receivedAt: '29 Oct, 08:16',
    pages: 2,
    status: 'extracted',
    linkedTo: 'CLM-24-1042',
    lines: [
      'NORTHSIDE AUTOS — APPROVED REPAIRER',
      'Estimate no. NA-20931',
      'Date: 29 October 2026',
      'Vehicle: 2021 Ford Puma, reg. LK21 XRT',
      'Customer: Harriet Okafor',
      'Rear bumper replacement ........ £1,240.00',
      'Tailgate repair and refinish ..... £1,610.00',
      'Parking sensors (2) .............. £380.00',
      'Labour 18.5 h @ £72 ............... £1,332.00',
      'Sundries ........................... £258.00',
      'Total (incl. VAT) ................. £4,820.00',
    ],
    fields: [
      { key: 'estimateNo', label: 'Estimate number', value: 'NA-20931', confidence: 0.99, sourceLine: 1 },
      { key: 'date', label: 'Estimate date', value: '29 Oct 2026', confidence: 0.98, sourceLine: 2 },
      { key: 'vehicle', label: 'Vehicle registration', value: 'LK21 XRT', confidence: 0.96, sourceLine: 3 },
      { key: 'customer', label: 'Customer', value: 'Harriet Okafor', confidence: 0.97, sourceLine: 4 },
      { key: 'labour', label: 'Labour hours', value: '18.5', confidence: 0.91, sourceLine: 8 },
      { key: 'total', label: 'Total incl. VAT', value: '£4,820.00', confidence: 0.99, sourceLine: 10 },
    ],
  },
  {
    id: 'DOC-7794',
    name: 'Contents list.xlsx',
    docType: 'Contents schedule',
    source: 'Email — claims@',
    receivedAt: '27 Oct, 10:02',
    pages: 1,
    status: 'needs-review',
    linkedTo: 'CLM-24-1047',
    issue: 'Two item values could not be matched to receipts.',
    lines: [
      'CONTENTS SCHEDULE — 14 Alder Grove',
      'Policy: HOM-210457',
      'Prepared by: Tomasz Wiśniewski',
      'Kitchen units (base, 6) ............ £3,900',
      'Engineered oak flooring 22 m² ...... £2,640',
      'Dishwasher (integrated) ............ £540',
      'Rug, hand-woven .................... £1,150  (no receipt)',
      'Dining chairs (4) .................. £720  (no receipt)',
      'Total claimed ...................... £8,950',
    ],
    fields: [
      { key: 'policy', label: 'Policy number', value: 'HOM-210457', confidence: 0.98, sourceLine: 1 },
      { key: 'items', label: 'Line items', value: '5', confidence: 0.94, sourceLine: 3 },
      { key: 'unverified', label: 'Items without receipt', value: '2', confidence: 0.71, sourceLine: 6 },
      { key: 'total', label: 'Total claimed', value: '£8,950', confidence: 0.97, sourceLine: 8 },
    ],
  },
  {
    id: 'DOC-7802',
    name: 'Roofing contractor quote.pdf',
    docType: 'Quote',
    source: 'Broker upload',
    receivedAt: '03 Nov, 15:20',
    pages: 3,
    status: 'extracted',
    linkedTo: 'CLM-24-1051',
    lines: [
      'APEX ROOFING SERVICES',
      'Quotation Q-6612',
      'Site: Unit 4, Brightwater Logistics, Thornbury',
      'Remove and replace 46 roof panels ..... £18,400',
      'Scaffold and access (10 days) ......... £4,200',
      'Gutter and flashing repair ............ £2,100',
      'Total (excl. VAT) ...................... £24,700',
    ],
    fields: [
      { key: 'quoteNo', label: 'Quote number', value: 'Q-6612', confidence: 0.99, sourceLine: 1 },
      { key: 'site', label: 'Site', value: 'Unit 4, Thornbury', confidence: 0.9, sourceLine: 2 },
      { key: 'panels', label: 'Panels replaced', value: '46', confidence: 0.93, sourceLine: 3 },
      { key: 'total', label: 'Total excl. VAT', value: '£24,700', confidence: 0.98, sourceLine: 6 },
    ],
  },
  {
    id: 'DOC-7810',
    name: 'Discharge summary — scan 0412.pdf',
    docType: 'Medical record',
    source: 'Provider SFTP',
    receivedAt: '05 Nov, 08:40',
    pages: 4,
    status: 'processing',
    lines: [],
    fields: [],
  },
  {
    id: 'DOC-7812',
    name: 'Bank statement — Oct.pdf',
    docType: 'Unclassified',
    source: 'Customer upload',
    receivedAt: '05 Nov, 09:05',
    pages: 6,
    status: 'failed',
    issue: 'File is password-protected. Ask the customer for an unlocked copy.',
    lines: [],
    fields: [],
  },
]
