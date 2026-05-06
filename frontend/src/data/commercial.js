import {
  emptyConsumerLead,
  dispositionGroups,
  loanFields,
  personalFields,
  sampleConsumerLeads,
} from './consumerDurable'
import {
  retailEditableFields,
  retailNonPaymentReasons,
  retailPaymentModes,
} from './retail'

export const sampleCommercialLeads = sampleConsumerLeads.map((lead, index) => ({
  ...lead,
  id: `commercial-lead-00${index + 1}`,
  portfolio: 'Commercial',
  listId: `CM-0526-00${index + 1}`,
  agreementNumber: index === 0 ? 'COM90281476' : 'COM90281477',
  uid: index === 0 ? 'C1234567890123456789' : 'C2234567890123456789',
}))

export const emptyCommercialLead = {
  ...emptyConsumerLead,
  portfolio: 'Commercial',
}

export const commercialConfig = {
  key: 'commercial',
  label: 'Commercial',
  shortLabel: 'Commercial',
  emptyLead: emptyCommercialLead,
  sampleLeads: sampleCommercialLeads,
  personalFields,
  loanFields,
  dispositionGroups,
  paymentModes: retailPaymentModes,
  reasonOptions: retailNonPaymentReasons,
  reasonLabel: 'Non Payment Reason',
  editableFields: retailEditableFields,
}
