import {
  emptyCommercialLead,
} from './commercial'
import {
  loanFields,
  personalFields,
} from './consumerDurable'
import {
  retailNonPaymentReasons,
  retailPaymentModes,
} from './retail'

export const editableFields = [
  {
    label: 'PTP/Paid/Pickup Amount',
    name: 'amount',
    placeholder: 'Minimum 500',
    type: 'number',
    help: 'Digit. Enter amount collected, promised, or assigned for pickup.',
  },
  {
    label: 'PTP/Paid/Pickup Date',
    name: 'actionDate',
    type: 'date',
    help: 'Calendar. Capture the promised, paid, or pickup date.',
  },
  {
    label: 'Transaction/Receipt No',
    name: 'receiptNo',
    placeholder: 'Receipt or transaction ID',
    help: 'Alpha-numeric. Required when payment is already made.',
  },
  {
    label: 'Pickup Time',
    name: 'pickupTime',
    type: 'time',
    help: 'Time. Required when pickup is selected.',
  },
  {
    label: 'Pickup Address',
    name: 'pickupAddress',
    placeholder: 'Pickup address',
    help: 'Text. Required when pickup is selected.',
  },
  {
    label: 'Paid to whom (Name)',
    name: 'paidToName',
    placeholder: 'Collector or executive name',
    help: 'Name. Capture who received or will receive payment.',
  },
  {
    label: 'Paid to whom (Contact no)',
    name: 'paidToContact',
    placeholder: '10 digit contact number',
    minLength: 10,
    maxLength: 10,
    help: '10 digit. Capture collector or executive contact number.',
  },
  {
    label: 'Paid Showroom',
    name: 'paidShowroom',
    placeholder: 'Dealer or showroom point',
    help: 'Name. Required when dealer/showroom payment mode is selected.',
  },
  {
    label: 'Call Back Date',
    name: 'callBackDate',
    type: 'date',
    help: 'Calendar. Required for callback disposition.',
  },
  {
    label: 'Call Back Time',
    name: 'callBackTime',
    type: 'time',
    help: 'Time. Capture callback time in AM/PM equivalent.',
  },
  {
    label: 'Non Payment Reason',
    name: 'nonPaymentReason',
    options: retailNonPaymentReasons,
    help: 'Dropdown. Reason customer refused or could not pay.',
  },
  {
    label: 'Customer Bouncing Reason',
    name: 'bouncingReason',
    options: retailNonPaymentReasons,
    help: 'Dropdown. Reason why EMI is bounced.',
  },
  {
    label: 'Remark',
    name: 'remark',
    placeholder: 'Type agent remarks',
    required: true,
    help: 'Text. Mandatory for every disposition.',
  },
]

export const dispositionGroups = [
  {
    name: 'Filed/TCM Positive Contact',
    options: ['OCP', 'BPTP', 'ONKT', 'Pickup', 'PTP', 'LPTP', 'AP', 'APCB'],
  },
  {
    name: 'Filed/TCM Contact',
    options: ['CLBK', 'CLBK_P', 'LMG', 'CD', 'RTP', 'sit Pend', 'WRNG'],
  },
  {
    name: 'Filed/TCM Non Contact',
    options: ['RNR', 'NB', 'SW', 'NR', 'NA', 'DNE', 'MIS', 'INV', 'NT', 'Dialer NC', 'AF', 'Drop', 'NA', 'ND'],
  },
]

export const FEEDBACK_FIELDS_BY_SUB_DISPOSITION = {
  OCP: ['amount', 'actionDate', 'receiptNo', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  BPTP: ['amount', 'actionDate', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  ONKT: ['amount', 'actionDate', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  Pickup: ['amount', 'actionDate', 'pickupTime', 'pickupAddress', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  PTP: ['amount', 'actionDate', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  LPTP: ['amount', 'actionDate', 'paymentMode', 'nonPaymentReason', 'bouncingReason', 'remark'],
  AP: ['amount', 'actionDate', 'receiptNo', 'paymentMode', 'paidToName', 'paidToContact', 'paidShowroom', 'nonPaymentReason', 'bouncingReason', 'remark'],
  APCB: ['amount', 'actionDate', 'paymentMode', 'paidToName', 'paidToContact', 'paidShowroom', 'callBackDate', 'callBackTime', 'nonPaymentReason', 'bouncingReason', 'remark'],
  CLBK: ['callBackDate', 'callBackTime', 'remark'],
  CLBK_P: ['amount', 'actionDate', 'receiptNo', 'pickupTime', 'pickupAddress', 'paymentMode', 'paidToName', 'paidToContact', 'paidShowroom', 'callBackDate', 'callBackTime', 'nonPaymentReason', 'bouncingReason', 'remark'],
  LMG: ['callBackDate', 'callBackTime', 'remark'],
  CD: ['remark'],
  RTP: ['nonPaymentReason', 'remark'],
  "sit Pend": ['remark'],
  WRNG: ['remark'],
  RNR: ['remark'],
  NB: ['remark'],
  SW: ['remark'],
  NR: ['remark'],
  NA: ['remark'],
  DNE: ['remark'],
  MIS: ['remark'],
  INV: ['remark'],
  NT: ['remark'],
  "Dialer NC": ['remark'],
  AF: ['remark'],
  Drop: ['remark'],
  ND: ['remark'],
}

export const REQUIRED_FIELDS_BY_SUB_DISPOSITION = {
  OCP: ['amount', 'actionDate', 'receiptNo', 'paymentMode', 'remark'],
  BPTP: ['amount', 'actionDate', 'paymentMode', 'remark'],
  ONKT: ['amount', 'actionDate', 'paymentMode', 'remark'],
  Pickup: ['amount', 'actionDate', 'pickupTime', 'pickupAddress', 'paymentMode', 'remark'],
  PTP: ['amount', 'actionDate', 'paymentMode', 'remark'],
  LPTP: ['amount', 'actionDate', 'paymentMode', 'remark'],
  AP: ['amount', 'actionDate', 'receiptNo', 'paymentMode', 'remark'],
  APCB: ['amount', 'actionDate', 'callBackDate', 'callBackTime', 'remark'],
  CLBK: ['callBackDate', 'callBackTime', 'remark'],
  CLBK_P: ['callBackDate', 'callBackTime', 'remark'],
  LMG: ['remark'],
  CD: ['remark'],
  RTP: ['nonPaymentReason', 'remark'],
  "sit Pend": ['remark'],
  WRNG: ['remark'],
  RNR: ['remark'],
  NB: ['remark'],
  SW: ['remark'],
  NR: ['remark'],
  NA: ['remark'],
  DNE: ['remark'],
  MIS: ['remark'],
  INV: ['remark'],
  NT: ['remark'],
  "Dialer NC": ['remark'],
  AF: ['remark'],
  Drop: ['remark'],
  ND: ['remark'],
}

export const commercialFollowupConfig = {
  key: 'commercial',
  label: 'Commercial (Follow-up)',
  shortLabel: 'Follow-up',
  emptyLead: emptyCommercialLead,
  personalFields,
  loanFields,
  dispositionGroups,
  paymentModes: retailPaymentModes,
  reasonOptions: retailNonPaymentReasons,
  reasonLabel: 'Non Payment Reason',
  editableFields,
}
